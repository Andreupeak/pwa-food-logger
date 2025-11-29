// backend/openaiVision.js
// Handles image → base64 → OpenAI Vision → portion estimation

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeImage(imagePath) {
  try {
    // read image
    const fileData = fs.readFileSync(imagePath);
    const base64Image = fileData.toString("base64");

    // call OpenAI vision
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // ✔ working model
      messages: [
        {
          role: "system",
          content:
            "You are a food vision assistant. Detect foods and estimate portion sizes in grams or household measures."
        },
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`
            },
            {
              type: "text",
              text: "Identify foods and estimate portion sizes. Output in strict JSON like: [{\"food\": \"rice\", \"amount\": \"120g\"}, ...]"
            }
          ]
        }
      ]
    });

    return response.choices[0].message;

  } catch (error) {
    console.error("OpenAI Vision error:", error);
    return { error: error.message };
  }
}

module.exports = { analyzeImage };
