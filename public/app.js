// public/app.js
/* Unified, robust frontend mapping for Edamam, FatSecret, Spoonacular, Vision */

const TABS = {
  quicklog: { title: "Quick Log — Edamam Food Database", apis: "Edamam Food DB" },
  packaged: { title: "Packaged Foods — FatSecret", apis: "FatSecret" },
  homecook: { title: "Home-Cooked — Edamam Nutrition Analysis", apis: "Edamam Nutrition" },
  recipes: { title: "Recipes — Spoonacular", apis: "Spoonacular" },
  planner: { title: "Meal Planner — Edamam Meal Planner", apis: "Edamam Meal Planner" },
  vision: { title: "Scan Meal — OpenAI Vision + Edamam", apis: "OpenAI Vision + Edamam" }
};

/* ---------- helpers ---------- */
function $(sel){ return document.querySelector(sel); }
function createEl(tag, cls){ const e = document.createElement(tag); if (cls) e.className = cls; return e; }
function numberOrZero(v){ const n = Number(v); return Number.isFinite(n) ? Math.round(n*10)/10 : 0; }

/* ---------- nutrient extractors ---------- */

/**
 * Edamam Food Parser (sample you pasted)
 * structure: { food: { nutrients: { ENERC_KCAL, PROCNT, FAT, CHOCDF, FIBTG } }, measures: [...], label }
 */
function extractFromEdamamParser(obj) {
  try {
    const food = obj.food || {};
    const nutrients = food.nutrients || {};
    const calories = numberOrZero(nutrients.ENERC_KCAL);
    const protein = numberOrZero(nutrients.PROCNT);
    const fat = numberOrZero(nutrients.FAT);
    const carbs = numberOrZero(nutrients.CHOCDF);
    const name = food.label || food.foodId || obj.label || 'Item';
    // try a reasonable serving weight if provided in measures[0].weight
    let serving_text = 'per 100 g';
    if (Array.isArray(obj.measures) && obj.measures.length>0 && obj.measures[0].weight) {
      serving_text = `${Math.round(obj.measures[0].weight)} g`;
    } else if (food.servingSize) {
      serving_text = food.servingSize;
    }
    return { name, calories, protein_g: protein, carbs_g: carbs, fat_g: fat, serving_text, raw: obj };
  } catch (e) {
    return null;
  }
}

/**
 * Edamam Nutrition Details response:
 * structure includes calories and totalNutrients.{PROCNT,CHOCDF,FAT}.quantity
 */
function extractFromEdamamNutritionDetails(obj) {
  try {
    const calories = numberOrZero(obj.calories || (obj.totalNutrients && obj.totalNutrients.ENERC_KCAL && obj.totalNutrients.ENERC_KCAL.quantity));
    const tp = obj.totalNutrients || {};
    const protein = numberOrZero(tp.PROCNT ? tp.PROCNT.quantity : (tp.PROCNT && tp.PROCNT.quantity));
    const carbs = numberOrZero(tp.CHOCDF ? tp.CHOCDF.quantity : (tp.CHOCDF && tp.CHOCDF.quantity));
    const fat = numberOrZero(tp.FAT ? tp.FAT.quantity : (tp.FAT && tp.FAT.quantity));
    const name = obj.recipe?.label || obj.title || 'Recipe';
    const serving_text = obj.totalWeight ? `${Math.round(obj.totalWeight)} g (analyzed)` : 'per recipe';
    return { name, calories, protein_g: protein, carbs_g: carbs, fat_g: fat, serving_text, raw: obj };
  } catch (e) {
    return null;
  }
}

/**
 * FatSecret search returns (example you pasted):
 * { food_description: "Per 100g - Calories: 89kcal | Fat: 0.33g | Carbs: 22.84g | Protein: 1.09g", ... }
 */
function extractFromFatSecret(obj) {
  try {
    const name = obj.food_name || obj.food || 'Item';
    const desc = obj.food_description || obj.food_desc || '';
    // parse numbers using regex
    const kcalMatch = desc.match(/Calories:\s*([0-9,.]+)\s*k?cal/i);
    const fatMatch = desc.match(/Fat:\s*([0-9,.]+)\s*g/i);
    const carbsMatch = desc.match(/Carbs:\s*([0-9,.]+)\s*g/i);
    const protMatch = desc.match(/Protein:\s*([0-9,.]+)\s*g/i);
    const calories = kcalMatch ? numberOrZero(kcalMatch[1]) : 0;
    const fat = fatMatch ? numberOrZero(fatMatch[1]) : 0;
    const carbs = carbsMatch ? numberOrZero(carbsMatch[1]) : 0;
    const protein = protMatch ? numberOrZero(protMatch[1]) : 0;
    const serving_text = 'per 100 g';
    return { name, calories, protein_g: protein, carbs_g: carbs, fat_g: fat, serving_text, raw: obj };
  } catch (e) {
    return null;
  }
}

/**
 * Spoonacular: searchByIngredients or recipe search often returns nutrition.nutrients array:
 * e.g. nutrition.nutrients = [{name: "Calories", amount: 200, unit: "kcal"}, {name: "Protein", amount: 5, unit: "g"}, ...]
 */
function extractFromSpoonacular(obj) {
  try {
    const name = obj.title || obj.name || obj.label || 'Recipe';
    const nutrients = obj.nutrition && obj.nutrition.nutrients ? obj.nutrition.nutrients : obj.nutrition || [];
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    if (Array.isArray(nutrients)) {
      for (const n of nutrients) {
        const nname = (n.name || '').toLowerCase();
        if (nname.includes('calorie')) calories = numberOrZero(n.amount || n.value);
        if (nname.includes('protein')) protein = numberOrZero(n.amount || n.value);
        if (nname.includes('carb')) carbs = numberOrZero(n.amount || n.value);
        if (nname.includes('fat')) fat = numberOrZero(n.amount || n.value);
      }
    } else if (typeof nutrients === 'object') {
      // some endpoints return an object with keys
      calories = numberOrZero(nutrients.calories || nutrients.ENERC_KCAL);
      protein = numberOrZero(nutrients.protein || nutrients.PROCNT);
      carbs = numberOrZero(nutrients.carbs || nutrients.CHOCDF);
      fat = numberOrZero(nutrients.fat || nutrients.FAT);
    }
    return { name, calories, protein_g: protein, carbs_g: carbs, fat_g: fat, serving_text: obj.servings ? `${obj.servings} servings` : 'per serving', raw: obj };
  } catch (e) {
    return null;
  }
}

/**
 * Vision items: expected shape from backend after parsing
 * [{ name: "rice", portion: "200 g", confidence: 0.85 }, ...]
 */
function extractFromVisionItem(item) {
  try {
    // portion may be "200 g" or "0.5 cup"; just pass portion through as serving_text.
    const name = item.name || item.label || 'Detected item';
    const serving_text = item.portion || item.amount || '1 serving';
    // calories/protein unknown here until we call nutrition endpoint
    return { name, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, serving_text, raw: item };
  } catch (e) {
    return null;
  }
}

/* ---------- UI render helpers ---------- */

function createNutritionCardDOM(card) {
  const wrap = createEl('div', 'border rounded-lg p-4 bg-white shadow');
  wrap.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <div class="text-lg font-semibold">${escapeHtml(card.name)}</div>
      <div class="text-sm text-gray-500">${escapeHtml(card.serving_text || '')}</div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div><strong>Calories</strong><div>${escapeHtml(String(card.calories))} kcal</div></div>
      <div><strong>Protein</strong><div>${escapeHtml(String(card.protein_g))} g</div></div>
      <div><strong>Carbs</strong><div>${escapeHtml(String(card.carbs_g))} g</div></div>
      <div><strong>Fat</strong><div>${escapeHtml(String(card.fat_g))} g</div></div>
    </div>
    <div class="mt-3 flex gap-2 justify-end">
      <button class="add-log px-3 py-1 bg-indigo-600 text-white rounded text-sm">Add to Daily Log</button>
      <button class="show-raw px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">Show Raw</button>
    </div>
    <pre class="mt-3 raw-block hidden text-xs text-gray-500" style="white-space:pre-wrap"></pre>
  `;
  // wire add to log
  wrap.querySelector('.add-log').addEventListener('click', ()=>{
    const arr = JSON.parse(localStorage.getItem('dailyLog')||'[]');
    arr.push(card);
    localStorage.setItem('dailyLog', JSON.stringify(arr));
    alert('Added to Daily Log');
  });
  // wire show raw
  wrap.querySelector('.show-raw').addEventListener('click', ()=>{
    const rawBlock = wrap.querySelector('.raw-block');
    rawBlock.textContent = JSON.stringify(card.raw || {}, null, 2);
    rawBlock.classList.toggle('hidden');
  });
  return wrap;
}

function escapeHtml(s){ if(s===undefined||s===null) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function createEl(tag, cls){ const e = document.createElement(tag); if (cls) e.className = cls; return e; }

/* ---------- main render function for provider responses ---------- */

function renderChoicesFromProvider(providerData, containerId, originalText = '', isVision = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (!providerData) { container.textContent = 'No results'; return; }

  // 1) Vision items (our backend tries to return items[])
  if (isVision && providerData.items && Array.isArray(providerData.items)) {
    providerData.items.forEach(item => {
      const card = extractFromVisionItem(item);
      const choice = createEl('div', 'border rounded-lg p-3 bg-white flex items-center justify-between');
      choice.innerHTML = `<div><div class="font-semibold">${escapeHtml(card.name)}</div><div class="text-sm text-gray-500">${escapeHtml(card.serving_text)}</div></div>
        <div class="flex gap-2"><button class="select-btn px-3 py-1 bg-green-600 text-white rounded">Select</button><button class="raw-btn px-3 py-1 bg-gray-100 rounded">Raw</button></div>`;
      container.appendChild(choice);
      choice.querySelector('.select-btn').addEventListener('click', async ()=>{
        // call backend nutrition-by-item with the portion (if portion includes a number) else default 100 g
        const serving = card.serving_text || '100 g';
        const text = `${serving} ${card.name}`;
        const res = await fetch('/api/edamam/nutrition-by-item', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text, name: card.name }) });
        const json = await res.json();
        container.appendChild(createNutritionCardDOM(json));
      });
      choice.querySelector('.raw-btn').addEventListener('click', ()=> alert(JSON.stringify(item, null, 2)));
    });
    return;
  }

  // 2) Edamam food parser: has .food and .measures
  if (providerData.food && providerData.food.nutrients) {
    const parsed = extractFromEdamamParser(providerData);
    const choice = createEl('div','border rounded-lg p-3 bg-white flex items-center justify-between');
    choice.innerHTML = `<div><div class="font-semibold">${escapeHtml(parsed.name)}</div><div class="text-sm text-gray-500">${escapeHtml(parsed.serving_text)}</div></div>
      <div class="flex gap-2"><button class="select-btn px-3 py-1 bg-green-600 text-white rounded">Select</button><button class="raw-btn px-3 py-1 bg-gray-100 rounded">Raw</button></div>`;
    container.appendChild(choice);
    choice.querySelector('.select-btn').addEventListener('click', async ()=>{
      // Use measures[0] if available
      let measureText = '100 g';
      if (Array.isArray(providerData.measures) && providerData.measures.length>0 && providerData.measures[0].weight) {
        measureText = `${Math.round(providerData.measures[0].weight)} g`;
      }
      const text = `${measureText} ${parsed.name}`;
      const res = await fetch('/api/edamam/nutrition-by-item', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text, name: parsed.name })});
      const json = await res.json();
      container.appendChild(createNutritionCardDOM(json));
    });
    choice.querySelector('.raw-btn').addEventListener('click', ()=> alert(JSON.stringify(providerData, null, 2)));
    return;
  }

  // 3) Edamam nutrition-details (full nutrition object) - detect by calories or totalNutrients
  if (providerData.calories || (providerData.totalNutrients && typeof providerData.totalNutrients === 'object')) {
    // format on client: try to extract using extractor
    const card = extractFromEdamamNutritionDetails(providerData);
    container.appendChild(createNutritionCardDOM(card));
    return;
  }

  // 4) FatSecret format (food_description string)
  if (providerData.food_description || providerData.food_name || providerData.food_id) {
    const card = extractFromFatSecret(providerData);
    container.appendChild(createNutritionCardDOM(card));
    return;
  }

  // 5) Spoonacular array or object
  if (Array.isArray(providerData)) {
    providerData.slice(0,8).forEach(item => {
      // item could be recipe objects
      const ex = extractFromSpoonacular(item) || { name: item.title || item.name || 'Recipe', calories: 0, serving_text: '1 serving', raw: item };
      const choice = createEl('div','border rounded-lg p-3 bg-white flex items-center justify-between');
      choice.innerHTML = `<div><div class="font-semibold">${escapeHtml(ex.name)}</div><div class="text-sm text-gray-500">${escapeHtml(ex.serving_text)}</div></div>
        <div class="flex gap-2"><a class="px-3 py-1 bg-indigo-600 text-white rounded" target="_blank" href="${item.sourceUrl||item.url||'#'}">Open</a></div>`;
      container.appendChild(choice);
    });
    return;
  }

  // 6) fallback: show raw and allow manual input
  const pre = createEl('pre','p-3 bg-white border rounded text-xs');
  pre.textContent = JSON.stringify(providerData, null, 2);
  container.appendChild(pre);

  const manualWrap = createEl('div','mt-2');
  manualWrap.innerHTML = `<div class="text-sm text-gray-600 mb-1">If you know the portion, enter it (e.g. "150 g chicken curry")</div>
    <input class="manual-input w-full p-2 border rounded" placeholder="e.g. 150 g chicken curry">
    <div class="mt-2"><button class="manual-go px-3 py-2 bg-blue-600 text-white rounded">Get Nutrition</button></div>`;
  container.appendChild(manualWrap);
  manualWrap.querySelector('.manual-go').addEventListener('click', async ()=>{
    const t = manualWrap.querySelector('.manual-input').value.trim();
    if (!t) return alert('Enter text');
    const res = await fetch('/api/edamam/nutrition-by-item', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: t, name: t })});
    const json = await res.json();
    container.appendChild(createNutritionCardDOM(json));
  });

}

/* ---------- wire up tabs and behavior (existing UI code) ---------- */

const tabContent = document.getElementById('tab-content');
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> setActive(btn.dataset.tab));
});
setActive('quicklog');

function setActive(key){
  const t = TABS[key];
  tabContent.innerHTML = `<h2 class="text-lg font-semibold mb-2">${t.title}</h2><div class="mb-4 text-sm text-gray-600">API: ${t.apis}</div>`;
  const area = createEl('div','space-y-3');
  tabContent.appendChild(area);

  if (key === 'quicklog') {
    area.innerHTML = `<input id="quick-input" class="w-full p-2 border rounded" placeholder="e.g. 1 banana">
      <div class="mt-2"><button id="quick-go" class="px-3 py-2 bg-blue-600 text-white rounded">Search</button></div>
      <div id="quick-choices" class="mt-3 space-y-3"></div>`;
    $('#quick-go').addEventListener('click', async ()=>{
      const q = $('#quick-input').value.trim();
      if(!q) return alert('Enter text');
      const res = await fetch('/api/edamam/food-parser', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: q })});
      const json = await res.json();
      renderChoicesFromProvider(json, 'quick-choices', q, false);
    });
    return;
  }

  if (key === 'packaged') {
    area.innerHTML = `<input id="pack-query" class="w-full p-2 border rounded" placeholder="Search product">
      <div class="mt-2"><button id="pack-search" class="px-3 py-2 bg-blue-600 text-white rounded">Search</button></div>
      <div id="pack-choices" class="mt-3 space-y-3"></div>`;
    $('#pack-search').addEventListener('click', async ()=>{
      const q = $('#pack-query').value.trim();
      if (!q) return alert('Enter query');
      const res = await fetch('/api/fatsecret/search', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ query: q })});
      const json = await res.json();
      renderChoicesFromProvider(json, 'pack-choices', q, false);
    });
    return;
  }

  if (key === 'homecook') {
    area.innerHTML = `<textarea id="home-input" class="w-full p-2 border rounded" rows="4" placeholder="2 chapatis + 1 cup dal + 150g chicken curry"></textarea>
      <div class="mt-2"><button id="home-analyze" class="px-3 py-2 bg-blue-600 text-white rounded">Analyze</button></div>
      <div id="home-result" class="mt-3"></div>`;
    $('#home-analyze').addEventListener('click', async ()=>{
      const q = $('#home-input').value.trim(); if(!q) return alert('Enter recipe');
      const res = await fetch('/api/edamam/nutrition', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ingredients: [q] })});
      const json = await res.json();
      // backend may already produce formatted card via /nutrition-by-item; but here we try to map directly
      const card = extractFromEdamamNutritionDetails(json) || (await (await fetch('/api/edamam/nutrition-by-item', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: q, name: q })})).json());
      $('#home-result').innerHTML = ''; $('#home-result').appendChild(createNutritionCardDOM(card));
    });
    return;
  }

  if (key === 'recipes') {
    area.innerHTML = `<input id="recipe-q" class="w-full p-2 border rounded" placeholder="ingredients">
      <div class="mt-2"><button id="recipe-go" class="px-3 py-2 bg-blue-600 text-white rounded">Search</button></div>
      <div id="recipe-result" class="mt-3"></div>`;
    $('#recipe-go').addEventListener('click', async ()=>{
      const q = $('#recipe-q').value.trim(); if(!q) return alert('Enter ingredients');
      const res = await fetch('/api/spoonacular/search-recipes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ingredients: q })});
      const json = await res.json();
      renderChoicesFromProvider(json, 'recipe-result', q, false);
    });
    return;
  }

  if (key === 'planner') {
    area.innerHTML = `<input id="planner-q" class="w-full p-2 border rounded" placeholder="e.g. vegetarian">
      <div class="mt-2"><button id="planner-go" class="px-3 py-2 bg-blue-600 text-white rounded">Generate</button></div>
      <div id="planner-result" class="mt-3"></div>`;
    $('#planner-go').addEventListener('click', async ()=>{
      const q = $('#planner-q').value.trim(); if(!q) return alert('Enter query');
      const res = await fetch('/api/edamam/recipes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ q })});
      const json = await res.json();
      document.getElementById('planner-result').textContent = JSON.stringify(json, null, 2);
    });
    return;
  }

  if (key === 'vision') {
    area.innerHTML = `<input id="vision-file" type="file" accept="image/*" class="block">
      <div class="mt-2"><button id="vision-scan" class="px-3 py-2 bg-blue-600 text-white rounded">Scan</button></div>
      <div id="vision-choices" class="mt-3"></div>`;
    $('#vision-scan').addEventListener('click', async ()=>{
      const f = $('#vision-file').files[0]; if(!f) return alert('Choose image');
      const fd = new FormData(); fd.append('image', f);
      const res = await fetch('/api/vision/scan', { method: 'POST', body: fd });
      const json = await res.json();
      // backend now returns { success:true, items: [...] } whenever possible
      renderChoicesFromProvider(json, 'vision-choices', null, true);
    });
    return;
  }
}

/* initialize daily log UI (simple) */
(function initLogButton(){
  const elOpen = document.getElementById('open-log');
  const elClear = document.getElementById('clear-log');
  if (elOpen) elOpen.addEventListener('click', () => {
    document.getElementById('log-modal').classList.add('show');
    // render list inside modal (simple)
    const list = document.getElementById('log-list');
    const data = JSON.parse(localStorage.getItem('dailyLog')||'[]');
    list.innerHTML = '';
    if (data.length===0) list.innerHTML = '<div class="text-sm text-gray-600">No entries yet</div>';
    data.forEach((d, idx)=>{
      const r = createEl('div','p-3 bg-white border rounded flex items-center justify-between');
      r.innerHTML = `<div><div class="font-semibold">${escapeHtml(d.name)}</div><div class="text-xs text-gray-500">${escapeHtml(d.serving_text)}</div></div>
        <div><button class="del px-2 py-1 bg-red-600 text-white rounded">Delete</button></div>`;
      r.querySelector('.del').addEventListener('click', ()=>{
        const arr = JSON.parse(localStorage.getItem('dailyLog')||'[]');
        arr.splice(idx,1); localStorage.setItem('dailyLog', JSON.stringify(arr));
        r.remove();
      });
      list.appendChild(r);
    });
  });
  document.getElementById('close-log').addEventListener('click', ()=> document.getElementById('log-modal').classList.remove('show'));
  document.getElementById('clear-log').addEventListener('click', ()=> {
    if(confirm('Clear daily log?')){ localStorage.removeItem('dailyLog'); alert('Cleared'); }
  });
})();
