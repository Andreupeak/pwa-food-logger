// backend/openaiVision.js
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Try to extract JSON from a text block:
 * - Removes ```json ... ``` fences
 * - Tries to find the first {...} or [...] block and parse it
 */
function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;

  // remove common markdown fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

  // If candidate already starts with [ or { try parse
  if (/^[\[\{]/.test(candidate)) {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // fall through to look for an inner JSON substring
    }
  }

  // Find first JSON-like substring (balanced-ish) — greedy simple approach
  const jsonMatch = candidate.match(/(\[([\s\S]*?)\]|\{([\s\S]*?)\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // give up
    }
  }

  return null;
}

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
              text:
                "Identify distinct foods on the plate and estimate portion sizes in grams or household measures. " +
                "Return a JSON array like [{\"name\":\"rice\",\"portion\":\"120 g\",\"confidence\":0.87}, ...]. If you cannot be exact, return best-guess strings."
            }
          ]
        }
      ],
      max_tokens: 700
    });

    // response.choices[0].message can be a complex object; try to find text content
    const assistant = response?.choices?.[0]?.message;
    // content might be string or array of content blocks.
    let textContent = null;

    if (!assistant) {
      return { success: true, raw: response };
    }

    if (typeof assistant === "string") {
      textContent = assistant;
    } else if (Array.isArray(assistant.content)) {
      // find the first block that contains text-like fields
      for (const block of assistant.content) {
        if (block.type === "output_text" || block.type === "text") {
          textContent = block.text || block;
          break;
        }
        // some blocks may embed the code fences inside 'text' key
        if (block.type === "assistant" && typeof block === "string") {
          textContent = block;
          break;
        }
      }
      // if still not found, try to stringify content blocks
      if (!textContent) {
        const possible = assistant.content.map(c => (typeof c === "string" ? c : JSON.stringify(c))).join("\n");
        textContent = possible;
      }
    } else if (assistant.content && typeof assistant.content === "object") {
      // sometimes assistant.content is an object; try to convert to string
      textContent = JSON.stringify(assistant.content);
    } else {
      textContent = String(assistant);
    }

    // Try to extract JSON from the text content
    const parsed = extractJsonFromText(String(textContent || ""));
    if (parsed) {
      // If parsed is an object (single food) wrap as array
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return { success: true, items, raw: response };
    }

    // No JSON found — return raw response (frontend will show it)
    return { success: true, raw: response, assistant_text: textContent };
  } catch (err) {
    console.error("OpenAI Vision error:", err);
    return { error: err.message || String(err), rawError: err.response?.data || null };
  }
}

export default { analyzeImage };
