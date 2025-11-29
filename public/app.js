// public/app.js
const TABS = {
  quicklog: {
    title: "Quick Log — Edamam Food Database",
    purpose: "Fast natural-language logging of simple/common foods.",
    best: "Quick logging of staples (rice, fruit, bread, eggs). Natural-language parsing of portions.",
    strengths: "Excellent parsing, good portion phrases (e.g. '1 cup cooked basmati rice'), suitable for calories & macros.",
    apis: "Edamam Food Database API"
  },
  packaged: {
    title: "Packaged Foods — FatSecret",
    purpose: "Packaged foods, barcode search, and branded items lookup.",
    best: "Barcode scanning and packaged items; simulating a diary.",
    strengths: "Large packaged-food coverage; reliable macros for common brands.",
    apis: "FatSecret API"
  },
  homecook: {
    title: "Home-Cooked — Edamam Nutrition Analysis",
    purpose: "Accurate nutrient breakdown for homemade Indian & German meals.",
    best: "Use when entering recipe-like descriptions: '2 chapatis + 1 cup dal + 150g chicken curry'",
    strengths: "Full macro & micro nutrients; reliable for mixed homemade dishes.",
    apis: "Edamam Nutrition Analysis API"
  },
  recipes: {
    title: "Recipes — Spoonacular",
    purpose: "Ingredient-to-recipe suggestions and recipe search.",
    best: "Enter ingredients to get recipes; view nutrition for recipes.",
    strengths: "Large recipe DB; good for discovering meals and viewing recipe nutrition.",
    apis: "Spoonacular API"
  },
  planner: {
    title: "Meal Planner — Edamam Meal Planner",
    purpose: "Generate structured, nutrition-aligned meal plans.",
    best: "User selects diet goals and calories; fetch a one-week plan.",
    strengths: "End-to-end planning using Edamam recipe data.",
    apis: "Edamam Meal Planner API"
  },
  vision: {
    title: "Scan Meal — OpenAI Vision + Edamam",
    purpose: "Photo → portion estimate (vision) → nutrition via Edamam.",
    best: "Use for photos of plates. Include a reference object (credit card/hand) for accuracy.",
    strengths: "Vision identifies items and estimates portions; Edamam computes nutrition from those estimates.",
    apis: "OpenAI Vision + Edamam Nutrition Analysis"
  }
};

const tabContent = document.getElementById('tab-content');
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> setActive(btn.dataset.tab));
});
setActive('quicklog');

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

  const form = document.createElement('div');
  form.className='space-y-3';
  if (key==='quicklog') {
    form.innerHTML = `<input id="quick-input" class="w-full p-2 border rounded" placeholder="e.g. 2 bananas and a coffee">
    <div><button id="quick-go" class="px-3 py-2 bg-blue-600 text-white rounded">Parse & Preview</button></div>
    <pre id="quick-result" class="results mt-2"></pre>`;
    tabContent.appendChild(form);
    document.getElementById('quick-go').onclick = async ()=>{
      const q = document.getElementById('quick-input').value.trim();
      if(!q) return alert('enter text');
      const res = await fetch('/api/edamam/food-parser',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q})});
      const json = await res.json();
      document.getElementById('quick-result').textContent = JSON.stringify(json,null,2);
    };
  } else if (key==='packaged') {
    form.innerHTML = `<input id="pack-query" class="w-full p-2 border rounded" placeholder="Search product name or barcode">
    <div><button id="pack-search" class="px-3 py-2 bg-blue-600 text-white rounded">Search</button></div>
    <pre id="pack-result" class="results mt-2"></pre>`;
    tabContent.appendChild(form);
    document.getElementById('pack-search').onclick = async ()=>{
      const q = document.getElementById('pack-query').value.trim();
      if(!q) return alert('enter query');
      const res = await fetch('/api/fatsecret/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})});
      const json = await res.json();
      document.getElementById('pack-result').textContent = JSON.stringify(json,null,2);
    };
  } else if (key==='homecook') {
    form.innerHTML = `<textarea id="home-input" class="w-full p-2 border rounded" rows="4" placeholder="2 chapatis + 1 cup dal + 150g chicken curry"></textarea>
    <div><button id="home-analyze" class="px-3 py-2 bg-blue-600 text-white rounded">Analyze Nutrition</button></div>
    <pre id="home-result" class="results mt-2"></pre>`;
    tabContent.appendChild(form);
    document.getElementById('home-analyze').onclick = async ()=>{
      const q = document.getElementById('home-input').value.trim();
      if(!q) return alert('enter ingredients');
      const res = await fetch('/api/edamam/nutrition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ingredients:[q]})});
      const json = await res.json();
      document.getElementById('home-result').textContent = JSON.stringify(json,null,2);
    };
  } else if (key==='recipes') {
    form.innerHTML = `<input id="recipe-ingredients" class="w-full p-2 border rounded" placeholder="paneer, spinach, garlic">
    <div><button id="recipe-search" class="px-3 py-2 bg-blue-600 text-white rounded">Search Recipes</button></div>
    <pre id="recipe-result" class="results mt-2"></pre>`;
    tabContent.appendChild(form);
    document.getElementById('recipe-search').onclick = async ()=>{
      const q = document.getElementById('recipe-ingredients').value.trim();
      if(!q) return alert('enter ingredients');
      const res = await fetch('/api/spoonacular/search-recipes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ingredients:q})});
      const json = await res.json();
      document.getElementById('recipe-result').textContent = JSON.stringify(json,null,2);
    };
  } else if (key==='planner') {
    form.innerHTML = `<input id="planner-q" class="w-full p-2 border rounded" placeholder="e.g. indian dinner">
    <div class="flex gap-2"><input id="planner-cal" class="p-2 border rounded" placeholder="Calories per day"><select id="planner-diet" class="p-2 border rounded"><option value=''>No preference</option><option value='vegetarian'>Vegetarian</option><option value='vegan'>Vegan</option></select></div>
    <div><button id="planner-go" class="px-3 py-2 bg-blue-600 text-white rounded">Generate Plan</button></div>
    <pre id="planner-result" class="results mt-2"></pre>`;
    tabContent.appendChild(form);
    document.getElementById('planner-go').onclick = async ()=>{
      const q = document.getElementById('planner-q').value.trim();
      const calories = document.getElementById('planner-cal').value.trim();
      const diet = document.getElementById('planner-diet').value;
      const res = await fetch('/api/edamam/recipes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q,calories,diet})});
      const json = await res.json();
      document.getElementById('planner-result').textContent = JSON.stringify(json,null,2);
    };
  } else if (key==='vision') {
    form.innerHTML = `<input id="vision-file" type="file" accept="image/*" class="block">
    <div><button id="vision-scan" class="px-3 py-2 bg-blue-600 text-white rounded">Scan & Estimate</button></div>
    <pre id="vision-result" class="results mt-2"></pre>`;
    tabContent.appendChild(form);
    document.getElementById('vision-scan').onclick = async ()=>{
      const f = document.getElementById('vision-file').files[0];
      if(!f) return alert('choose image');
      const fd = new FormData();
      fd.append('image', f);
      const res = await fetch('/api/vision/scan',{method:'POST',body:fd});
      const json = await res.json();
      document.getElementById('vision-result').textContent = JSON.stringify(json,null,2);
    };
  }

}
