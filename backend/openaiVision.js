// backend/openaiVision.js
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeImage(imagePath) {
  try {
    // read image -> base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64}`
              }
            },
            {
              type: "text",
              text: "Identify foods in this photo and estimate portions."
            }
          ]
        }
      ]
    });

    return {
      success: true,
      result: response.choices?.[0]?.message?.content || "No response"
    };

  } catch (err) {
    return { error: err.message || String(err) };
  }
}

export default { analyzeImage };
