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

// Only ONE import — correct
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

// --------------------- EDAMAM: Food parser ---------------------
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

// --------------------- EDAMAM: Nutrition analysis ---------------------
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

// --------------------- EDAMAM: Recipes ---------------------
app.post('/api/edamam/recipes', async (req, res) => {
  try {
    const { q, calories, diet } = req.body;
    const data = await edamam.searchRecipes({ q, calories, diet });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// --------------------- SPOONACULAR ---------------------
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

// --------------------- FATSECRET ---------------------
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

// --------------------- OPENAI VISION ---------------------
app.post('/api/vision/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image required' });

    const result = await openaiVision.analyzeImage(req.file.path);

    // Delete uploaded image after processing
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json(result);

  } catch (err) {

    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.status(500).json({ error: err.message || String(err) });
  }
});

// --------------------- HEALTH CHECK ---------------------
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// --------------------- SERVE FRONTEND ---------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
