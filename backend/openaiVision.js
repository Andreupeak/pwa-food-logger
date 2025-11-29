// backend/openaiVision.js
// ESM version for your project

import fs from "fs";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeImage(imagePath) {
  try {
    // Convert image → base64
    const bytes = fs.readFileSync(imagePath);
    const base64Image = bytes.toString("base64");

    // Send to OpenAI Vision
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini", // ✔ valid model
      messages: [
        {
          role: "system",
          content:
            "You are a food vision assistant. Identify foods and estimate portion sizes in grams or household measures."
        },
        {
          role: "user",
          content: [
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`,
            },
            {
              type: "text",
              text: "Identify foods and estimate portion sizes. Output in JSON like: [{\"food\":\"rice\",\"amount\":\"120g\"}]"
            }
          ]
        }
      ]
    });

    return response.choices[0].message;

  } catch (err) {
    console.error("OpenAI Vision error:", err);
    return { error: err.message };
  }
}

export default { analyzeImage };
