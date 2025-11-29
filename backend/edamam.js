// backend/edamam.js
import axios from 'axios';

const FOOD_APP_ID = process.env.EDAMAM_FOOD_APP_ID;
const FOOD_APP_KEY = process.env.EDAMAM_FOOD_APP_KEY;
const NUTRI_APP_ID = process.env.EDAMAM_NUTRITION_APP_ID;
const NUTRI_APP_KEY = process.env.EDAMAM_NUTRITION_APP_KEY;
const RECIPE_APP_ID = process.env.EDAMAM_RECIPE_APP_ID;
const RECIPE_APP_KEY = process.env.EDAMAM_RECIPE_APP_KEY;

if (!FOOD_APP_ID || !FOOD_APP_KEY) console.warn('Edamam Food DB keys missing');
if (!NUTRI_APP_ID || !NUTRI_APP_KEY) console.warn('Edamam Nutrition keys missing');
if (!RECIPE_APP_ID || !RECIPE_APP_KEY) console.warn('Edamam Recipe keys missing');

export async function parseFood(text) {
  // Food Database parser - GET ingr param
  const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${FOOD_APP_ID}&app_key=${FOOD_APP_KEY}&ingr=${encodeURIComponent(text)}`;
  const res = await axios.get(url);
  return res.data;
}

export async function analyzeNutrition(ingredients) {
  // Nutrition Details: POST body: { title, ingr: [ ... ] }
  const url = `https://api.edamam.com/api/nutrition-details?app_id=${NUTRI_APP_ID}&app_key=${NUTRI_APP_KEY}`;
  const body = {
    title: 'User Recipe',
    ingr: Array.isArray(ingredients) ? ingredients : [ingredients]
  };
  const res = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' }});
  return res.data;
}

export async function searchRecipes({ q, calories, diet }) {
  // Recipe Search (recipes/v2). Customize filters as needed.
  let url = `https://api.edamam.com/api/recipes/v2?type=public&app_id=${RECIPE_APP_ID}&app_key=${RECIPE_APP_KEY}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  if (calories) url += `&calories=${encodeURIComponent(calories)}`;
  if (diet) url += `&diet=${encodeURIComponent(diet)}`;
  const res = await axios.get(url);
  return res.data;
}

export default { parseFood, analyzeNutrition, searchRecipes };
