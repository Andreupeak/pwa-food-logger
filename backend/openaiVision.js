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
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // vision-capable
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` }
            },
            {
              type: "text",
              text: "Identify distinct foods on the plate and estimate portion sizes in grams or household measures. Return JSON array like [{\"name\":\"rice\",\"portion\":\"120 g\",\"confidence\":0.87}, ...]."
            }
          ]
        }
      ]
    });

    // Try to parse the assistant returned text if it returned a text block; else return raw
    try {
      const assistant = response.choices?.[0]?.message;
      // if assistant.content contains text items, attempt parse
      const content = assistant?.content;
      // content may be an array with text blocks; extract any text
      let textOut = null;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c.type === "output_text" || c.type === "text") {
            textOut = c.text || c; 
            break;
          }
        }
      }
      if (!textOut && typeof assistant === "string") textOut = assistant;
      // If textOut looks like JSON, parse and return items
      if (textOut) {
        const cleaned = (typeof textOut === "string") ? textOut.trim() : null;
        if (cleaned && (cleaned.startsWith("[") || cleaned.startsWith("{"))) {
          try {
            const parsed = JSON.parse(cleaned);
            return { success: true, items: parsed, raw: response };
          } catch (e) {
            // not JSON, return raw assistant content
          }
        }
      }
      // fallback: return raw response
      return { success: true, raw: response };
    } catch (e) {
      return { success: true, raw: response };
    }

  } catch (err) {
    console.error("OpenAI Vision error:", err);
    return { error: err.message || String(err), rawError: err.response?.data || null };
  }
}

export default { analyzeImage };
