// server.js
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import fatsecret from './backend/fatsecret.js';
import edamam from './backend/edamam.js';
import spoonacular from './backend/spoonacular.js';
import openaiVision from './backend/openaiVision.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', express.static(path.join(__dirname, 'public')));

/* --------------------- EDAMAM: Food parser --------------------- */
app.post('/api/edamam/food-parser', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const data = await edamam.parseFood(text);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* --------------------- EDAMAM: Nutrition analysis --------------------- */
app.post('/api/edamam/nutrition', async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients) return res.status(400).json({ error: 'ingredients required' });
    const data = await edamam.analyzeNutrition(ingredients);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* --------------------- EDAMAM: Nutrition for a single selected item --------------- */
function formatEdamamNutrition(nutriResponse, nameHint = '') {
  try {
    const calories = Math.round(nutriResponse.calories || 0);
    const totalNutrients = nutriResponse.totalNutrients || {};
    const protein = totalNutrients.PROCNT ? +(totalNutrients.PROCNT.quantity || 0) : 0;
    const carbs = totalNutrients.CHOCDF ? +(totalNutrients.CHOCDF.quantity || 0) : 0;
    const fat = totalNutrients.FAT ? +(totalNutrients.FAT.quantity || 0) : 0;
    const weight = nutriResponse.totalWeight || null;
    const serving_text = weight ? `${Math.round(weight)} g (analyzed)` : 'per recipe';
    return {
      name: nameHint || (nutriResponse.recipe && nutriResponse.recipe.label) || 'Item',
      serving_text,
      calories,
      protein_g: +(protein.toFixed(1)),
      carbs_g: +(carbs.toFixed(1)),
      fat_g: +(fat.toFixed(1)),
      raw: nutriResponse
    };
  } catch (e) {
    return { error: 'Could not format nutrition', raw: nutriResponse };
  }
}

app.post('/api/edamam/nutrition-by-item', async (req, res) => {
  try {
    const { text, name } = req.body;
    if (!text) return res.status(400).json({ error: 'text required (e.g. "100 g basmati rice")' });
    const nutri = await edamam.analyzeNutrition([text]);
    const card = formatEdamamNutrition(nutri, name || text);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* --------------------- EDAMAM: recipe search / meal planner --------------------- */
app.post('/api/edamam/recipes', async (req, res) => {
  try {
    const { q, calories, diet } = req.body;
    const data = await edamam.searchRecipes({ q, calories, diet });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* --------------------- SPOONACULAR --------------------- */
app.post('/api/spoonacular/search-recipes', async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients) return res.status(400).json({ error: 'ingredients required' });
    const data = await spoonacular.findByIngredients(ingredients);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* --------------------- FATSECRET --------------------- */
app.post('/api/fatsecret/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    const data = await fatsecret.searchFoods(query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* --------------------- OPENAI VISION --------------------- */
app.post('/api/vision/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image required' });
    const result = await openaiVision.analyzeImage(req.file.path);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json(result);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/* --------------------- HEALTH --------------------- */
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

/* --------------------- SPA fallback --------------------- */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* --------------------- START --------------------- */
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
