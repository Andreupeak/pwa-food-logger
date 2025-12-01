// public/app.js
/* eslint-disable */
const TABS = {
  quicklog: {
    title: "Quick Log — Edamam Food Database",
    purpose: "Fast natural-language logging of simple/common foods.",
    best: "Quick logging of staples (rice, fruit, bread, eggs).",
    strengths: "Natural-language parsing & portion detection.",
    apis: "Edamam Food Database API"
  },
  packaged: {
    title: "Packaged Foods — FatSecret",
    purpose: "Packaged foods, barcode search, and branded items lookup.",
    best: "Packaged/barcoded foods.",
    strengths: "Brand coverage & packaged items.",
    apis: "FatSecret API"
  },
  homecook: {
    title: "Home-Cooked — Edamam Nutrition Analysis",
    purpose: "Accurate nutrient breakdown for homemade meals.",
    best: "Recipe-like text -> full analysis.",
    strengths: "Full macro & micro nutrients.",
    apis: "Edamam Nutrition Analysis API"
  },
  recipes: {
    title: "Recipes — Spoonacular",
    purpose: "Ingredient → recipe suggestions.",
    apis: "Spoonacular API"
  },
  planner: {
    title: "Meal Planner — Edamam Meal Planner",
    purpose: "Auto meal planner.",
    apis: "Edamam Meal Planner API"
  },
  vision: {
    title: "Scan Meal — OpenAI Vision + Edamam",
    purpose: "Photo → portion estimate → nutrition.",
    apis: "OpenAI Vision + Edamam"
  }
};

/* --------- UI bootstrap --------- */
const tabContent = document.getElementById('tab-content');
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> setActive(btn.dataset.tab));
});
setActive('quicklog');

/* Daily log modal */
const logModal = document.getElementById('log-modal');
const logListEl = document.getElementById('log-list');
document.getElementById('open-log').addEventListener('click', showLog);
document.getElementById('close-log').addEventListener('click', hideLog);
document.getElementById('clear-log').addEventListener('click', ()=>{ if(confirm('Clear daily log?')){ localStorage.removeItem('dailyLog'); renderLog(); } });

function showLog(){ logModal.classList.add('show'); renderLog(); }
function hideLog(){ logModal.classList.remove('show'); }

/* storage helpers */
function readLog(){
  try { return JSON.parse(localStorage.getItem('dailyLog')||'[]'); } catch(e){ return []; }
}
function saveLog(arr){ localStorage.setItem('dailyLog', JSON.stringify(arr)); }

/* render log */
function renderLog(){
  const arr = readLog();
  logListEl.innerHTML = '';
  if (arr.length===0){ logListEl.innerHTML = '<div class="text-sm text-gray-600">No entries yet.</div>'; return; }
  arr.forEach((item, idx)=>{
    const el = document.createElement('div');
    el.className = 'p-3 bg-white border rounded flex items-start justify-between';
    el.innerHTML = `<div>
      <div class="font-semibold">${escapeHtml(item.name)}</div>
      <div class="text-xs text-gray-500">${escapeHtml(item.serving_text)} • ${item.calories} kcal</div>
    </div>
    <div class="flex gap-2">
      <button class="del-btn px-2 py-1 text-sm bg-red-600 text-white rounded">Delete</button>
    </div>`;
    el.querySelector('.del-btn').addEventListener('click', ()=>{
      if (!confirm('Delete this entry?')) return;
      arr.splice(idx,1); saveLog(arr); renderLog();
    });
    logListEl.appendChild(el);
  });
}

/* small utility */
function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* ---------- Helpers to create UI blocks (cards) ---------- */

function cardWrapper() {
  const wrapper = document.createElement('div');
  wrapper.className = 'space-y-3';
  return wrapper;
}

function createChoiceCard(label, small, kcalText = '', id = '') {
  const el = document.createElement('div');
  el.className = 'border rounded-lg p-3 shadow-sm bg-white flex items-center justify-between';
  el.innerHTML = `<div>
      <div class="font-semibold text-lg">${escapeHtml(label)}</div>
      <div class="text-sm text-gray-500">${escapeHtml(small)}</div>
    </div>
    <div class="text-right">
      <div class="text-sm text-gray-700 font-medium">${escapeHtml(kcalText)}</div>
      <div class="mt-2 flex gap-2 justify-end">
        <button class="select-btn px-3 py-1 bg-green-600 text-white rounded text-sm">Select</button>
        <button class="raw-btn px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">Show Raw</button>
      </div>
    </div>`;
  return el;
}

function createNutritionCard(card){
  const el = document.createElement('div');
  el.className = 'border rounded-lg p-4 bg-white shadow';
  el.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <div class="text-lg font-semibold">${escapeHtml(card.name)}</div>
      <div class="text-sm text-gray-500">${escapeHtml(card.serving_text||'')}</div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div><strong>Calories</strong><div>${card.calories} kcal</div></div>
      <div><strong>Protein</strong><div>${card.protein_g} g</div></div>
      <div><strong>Carbs</strong><div>${card.carbs_g} g</div></div>
      <div><strong>Fat</strong><div>${card.fat_g} g</div></div>
    </div>
    <div class="mt-3 flex gap-2 justify-end">
      <button class="add-log px-3 py-1 bg-indigo-600 text-white rounded text-sm">Add to Daily Log</button>
      <button class="raw-btn px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">Show Raw</button>
    </div>
    <pre class="mt-3 text-xs text-gray-500 raw-area hidden" style="white-space:pre-wrap"></pre>
  `;
  // show raw handler
  el.querySelectorAll('.raw-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const raw = el.querySelector('.raw-area');
      raw.classList.toggle('hidden');
    });
  });
  // add to log handler
  el.querySelector('.add-log').addEventListener('click', ()=>{
    const arr = readLog();
    arr.push(card);
    saveLog(arr);
    alert('Added to Daily Log');
  });
  return el;
}

/* ---------- small network helpers ---------- */
async function postJson(url, body){
  const res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  return res.json();
}
async function postForm(url, formData){
  const res = await fetch(url, { method: 'POST', body: formData });
  return res.json();
}

/* ---------- Render tab content ---------- */
function setActive(key){
  const t = TABS[key];
  tabContent.innerHTML = '';
  const header = document.createElement('div');
  header.innerHTML = `<h2 class="text-lg font-semibold mb-2">${t.title}</h2>
  <div class="mb-2"><strong>Purpose:</strong> ${t.purpose}</div>
  <div class="mb-2"><strong>Best uses:</strong> ${t.best}</div>
  <div class="mb-2"><strong>Strengths:</strong> ${t.strengths}</div>
  <div class="mb-4"><strong>APIs used:</strong> ${t.apis}</div>`;
  tabContent.appendChild(header);

  const wrapper = cardWrapper();
  tabContent.appendChild(wrapper);

  if (key === 'quicklog'){
    wrapper.innerHTML = `<input id="quick-input" class="w-full p-2 border rounded" placeholder="e.g. 2 bananas and a coffee">
      <div class="mt-2"><button id="quick-go" class="px-3 py-2 bg-blue-600 text-white rounded">Parse & Preview</button></div>
      <div id="quick-choices" class="mt-3 space-y-3"></div>
      <div id="quick-result" class="mt-3"></div>`;
    document.getElementById('quick-go').addEventListener('click', async ()=>{
      const q = document.getElementById('quick-input').value.trim();
      if(!q) return alert('Enter text');
      const r = await postJson('/api/edamam/food-parser', { text: q });
      renderChoicesFromProvider(r, 'quick-choices', q);
    });
    return;
  }

  if (key === 'packaged'){
    wrapper.innerHTML = `<input id="pack-query" class="w-full p-2 border rounded" placeholder="Search product name or barcode">
    <div class="mt-2"><button id="pack-search" class="px-3 py-2 bg-blue-600 text-white rounded">Search</button></div>
    <div id="pack-choices" class="mt-3 space-y-3"></div>
    <div id="pack-result" class="mt-3"></div>`;
    document.getElementById('pack-search').addEventListener('click', async ()=>{
      const q = document.getElementById('pack-query').value.trim();
      if(!q) return alert('Enter query');
      const res = await postJson('/api/fatsecret/search', { query: q });
      renderChoicesFromProvider(res, 'pack-choices', q);
    });
    return;
  }

  if (key === 'homecook'){
    wrapper.innerHTML = `<textarea id="home-input" class="w-full p-2 border rounded" rows="4" placeholder="2 chapatis + 1 cup dal + 150g chicken curry"></textarea>
      <div class="mt-2 flex gap-2">
        <button id="home-analyze" class="px-3 py-2 bg-blue-600 text-white rounded">Analyze Nutrition</button>
      </div>
      <div id="home-result" class="mt-3"></div>`;
    document.getElementById('home-analyze').addEventListener('click', async ()=>{
      const q = document.getElementById('home-input').value.trim();
      if(!q) return alert('Enter recipe text');
      // Edamam nutrition analysis returns full nutrition - best to call /nutrition-by-item to format
      const card = await postJson('/api/edamam/nutrition-by-item', { text: q, name: q });
      const el = createNutritionCard(card);
      document.getElementById('home-result').innerHTML = '';
      document.getElementById('home-result').appendChild(el);
    });
    return;
  }

  if (key === 'recipes'){
    wrapper.innerHTML = `<input id="recipe-ingredients" class="w-full p-2 border rounded" placeholder="paneer, spinach, garlic">
    <div class="mt-2"><button id="recipe-search" class="px-3 py-2 bg-blue-600 text-white rounded">Search Recipes</button></div>
    <div id="recipe-result" class="mt-3"></div>`;
    document.getElementById('recipe-search').addEventListener('click', async ()=>{
      const q = document.getElementById('recipe-ingredients').value.trim();
      if(!q) return alert('Enter ingredients');
      const data = await postJson('/api/spoonacular/search-recipes', { ingredients: q });
      // show recipe list as selectable cards (title, readyInMinutes etc.)
      const cont = document.getElementById('recipe-result'); cont.innerHTML = '';
      if (!Array.isArray(data)) { cont.textContent = JSON.stringify(data, null, 2); return; }
      data.slice(0,8).forEach(r => {
        const el = document.createElement('div');
        el.className = 'border rounded p-3 bg-white flex items-center justify-between';
        el.innerHTML = `<div>
            <div class="font-semibold">${escapeHtml(r.title||r.name||'Recipe')}</div>
            <div class="text-sm text-gray-500">${r.readyInMinutes ? r.readyInMinutes + ' min' : ''}</div>
          </div>
          <div><a target="_blank" href="${r.sourceUrl || r.url || '#'}" class="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Open</a></div>`;
        cont.appendChild(el);
      });
    });
    return;
  }

  if (key === 'planner'){
    wrapper.innerHTML = `<input id="planner-q" class="w-full p-2 border rounded" placeholder="e.g. indian dinner">
      <div class="mt-2 flex gap-2">
        <input id="planner-cal" class="p-2 border rounded" placeholder="Calories per day">
        <select id="planner-diet" class="p-2 border rounded">
          <option value=''>No preference</option>
          <option value='vegetarian'>Vegetarian</option>
          <option value='vegan'>Vegan</option>
        </select>
        <button id="planner-go" class="px-3 py-2 bg-blue-600 text-white rounded">Generate Plan</button>
      </div>
      <div id="planner-result" class="mt-3"></div>`;
    document.getElementById('planner-go').addEventListener('click', async ()=>{
      const q = document.getElementById('planner-q').value.trim();
      const calories = document.getElementById('planner-cal').value.trim();
      const diet = document.getElementById('planner-diet').value;
      const res = await postJson('/api/edamam/recipes', { q, calories, diet });
      document.getElementById('planner-result').textContent = JSON.stringify(res, null, 2);
    });
    return;
  }

  if (key === 'vision'){
    wrapper.innerHTML = `<input id="vision-file" type="file" accept="image/*" class="block">
      <div class="mt-2"><button id="vision-scan" class="px-3 py-2 bg-blue-600 text-white rounded">Scan & Estimate</button></div>
      <div id="vision-choices" class="mt-3 space-y-3"></div>
      <div id="vision-result" class="mt-3"></div>`;
    document.getElementById('vision-scan').addEventListener('click', async ()=>{
      const f = document.getElementById('vision-file').files[0];
      if(!f) return alert('Choose image');
      const fd = new FormData(); fd.append('image', f);
      const r = await postForm('/api/vision/scan', fd);
      // adapt vision output to choices: prefer items[] or raw
      renderChoicesFromProvider(r, 'vision-choices', null, true);
    });
    return;
  }
}

/* ---------- Shared rendering logic for provider responses ---------- */

function renderChoicesFromProvider(providerData, containerId, originalText = '', isVision=false){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (!providerData) { container.innerText = 'No results'; return; }

  // If vision returned items
  if (isVision && providerData.items && Array.isArray(providerData.items) && providerData.items.length>0){
    providerData.items.forEach(it => {
      const label = it.name || it.label || 'Detected item';
      const portion = it.portion || it.amount || (it.weight ? `${it.weight} g` : '100 g');
      const cardEl = createChoiceCard(label, `confidence ${(it.confidence||0).toFixed(2)}`, portion);
      container.appendChild(cardEl);
      wireChoiceCard(cardEl, label, portion, it);
    });
    return;
  }

  // Edamam parser 'hints'
  if (providerData.hints && Array.isArray(providerData.hints) && providerData.hints.length>0){
    providerData.hints.slice(0,8).forEach(h=>{
      const label = (h.food && (h.food.label || h.food.food)) || JSON.stringify(h.food);
      let measure = '100 g';
      if (h.measures && h.measures.length>0){
        const m = h.measures.find(m=>m.weight) || h.measures[0];
        if (m && m.weight) measure = `${Math.round(m.weight)} g`;
        else if (m && m.label) measure = `1 ${m.label}`;
      }
      const kcalText = (h.food && h.food.nutrients && h.food.nutrients.ENERC_KCAL) ? `${Math.round(h.food.nutrients.ENERC_KCAL)} kcal` : '';
      const cardEl = createChoiceCard(label, h.food && h.food.category ? h.food.category : '', measure + (kcalText ? ' • ' + kcalText : ''));
      container.appendChild(cardEl);
      wireChoiceCard(cardEl, label, measure, h);
    });
    return;
  }

  // Edamam parsed
  if (providerData.parsed && Array.isArray(providerData.parsed) && providerData.parsed.length>0){
    providerData.parsed.slice(0,6).forEach(p=>{
      const label = (p.food && p.food.label) || JSON.stringify(p);
      const cardEl = createChoiceCard(label, '', '100 g');
      container.appendChild(cardEl);
      wireChoiceCard(cardEl, label, '100 g', p);
    });
    return;
  }

  // FatSecret: normalized mapping attempt
  if (providerData.foods && providerData.foods.food){
    const arr = Array.isArray(providerData.foods.food) ? providerData.foods.food : [providerData.foods.food];
    arr.slice(0,8).forEach(f=>{
      const label = f.food_name || f.name || JSON.stringify(f);
      const cardEl = createChoiceCard(label, f.brand_name || '', '100 g');
      container.appendChild(cardEl);
      wireChoiceCard(cardEl, label, '100 g', f);
    });
    return;
  }

  // Spoonacular array
  if (Array.isArray(providerData)){
    providerData.slice(0,8).forEach(p=>{
      const label = p.title || p.name || p.label || JSON.stringify(p);
      const cardEl = createChoiceCard(label, p.sourceName || '', '1 serving');
      container.appendChild(cardEl);
      wireChoiceCard(cardEl, label, '1 serving', p);
    });
    return;
  }

  // If providerData looks like nutrition details (calories field), call /nutrition-by-item to format
  if (providerData.calories){
    // Use originalText if provided, else fallback to 100 g Item
    const name = originalText || (providerData.recipe && providerData.recipe.label) || 'Item';
    postJson('/api/edamam/nutrition-by-item', { text: `${providerData.totalWeight ? Math.round(providerData.totalWeight)+' g' : '100 g'} ${name}`, name })
      .then(card => {
        container.appendChild(createNutritionCard(card));
      }).catch(e=>{
        container.innerText = 'Could not format nutrition: ' + (e.message || JSON.stringify(e));
      });
    return;
  }

  // fallback: raw JSON + manual input
  const raw = document.createElement('pre');
  raw.className = 'p-3 bg-white border rounded text-xs';
  raw.textContent = JSON.stringify(providerData, null, 2);
  container.appendChild(raw);
  const manualWrap = document.createElement('div');
  manualWrap.className = 'mt-2';
  manualWrap.innerHTML = `<div class="text-sm text-gray-600 mb-1">If you know the portion, enter it here (e.g. "150 g chicken curry")</div>
    <input class="manual-ingredient w-full p-2 border rounded" placeholder="e.g. 150 g chicken curry">
    <div class="mt-2"><button class="manual-go px-3 py-2 bg-blue-600 text-white rounded">Get Nutrition</button></div>
  `;
  container.appendChild(manualWrap);
  manualWrap.querySelector('.manual-go').addEventListener('click', async ()=>{
    const t = manualWrap.querySelector('.manual-ingredient').value.trim();
    if(!t) return alert('Enter ingredient');
    const card = await postJson('/api/edamam/nutrition-by-item', { text: t, name: t });
    container.appendChild(createNutritionCard(card));
  });
}

/* wires select button handlers for choice cards */
function wireChoiceCard(cardEl, label, measureText, rawObject){
  const sel = cardEl.querySelector('.select-btn');
  const rawBtn = cardEl.querySelector('.raw-btn');
  sel.addEventListener('click', async ()=>{
    sel.textContent = 'Loading...'; sel.disabled = true;
    const ingredientText = `${measureText} ${label}`;
    const card = await postJson('/api/edamam/nutrition-by-item', { text: ingredientText, name: label });
    // show resulting nutrition card right after this card
    const result = createNutritionCard(card);
    // attach raw JSON to nutrition card's raw area
    try { result.querySelector('.raw-area').textContent = JSON.stringify(card.raw||{}, null, 2); } catch(e){}
    cardEl.after(result);
    sel.textContent = 'Select'; sel.disabled = false;
  });
  rawBtn.addEventListener('click', ()=>{
    alert(JSON.stringify(rawObject, null, 2));
  });
}

/* Kick-off done */
