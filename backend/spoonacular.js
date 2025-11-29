// backend/spoonacular.js
import axios from 'axios';

const KEY = process.env.SPOONACULAR_API_KEY;
if (!KEY) console.warn('Spoonacular key missing');

export async function findByIngredients(ingredients) {
  // ingredients: comma-separated string
  const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=6&apiKey=${KEY}`;
  const res = await axios.get(url);
  return res.data;
}

export default { findByIngredients };
