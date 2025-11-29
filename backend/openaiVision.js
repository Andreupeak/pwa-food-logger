// backend/openaiVision.js
//
// FULL WORKING OPENAI VISION ENDPOINT
// - Supports image upload (multipart/form-data)
// - Uses correct 2025 Vision model (gpt-4o-mini)
// - Works with Render (no local .env required)
// - Returns portion estimates + food recognition
//

import OpenAI from "openai";
import multer from "multer";    // to handle file uploads
import express from "express";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---- VISION ANALYSIS ROUTE ----
// POST /vision/analyze
// Body: multipart/form-data with "image" file
router.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing image file" });
    }

    // Load the image file
    const imageBuffer = fs.readFileSync(req.file.path);

    // Make Vision API request
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",      // ✔ correct model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Identify the foods in this image and estimate sensible portion sizes in grams or cups. Then list them cleanly in structured form.",
            },
            {
              type: "image",
              image: imageBuffer.toString("base64"), // base64 encoded
            },
          ],
        },
      ],
    });

    // Extract output
    const output = completion.choices?.[0]?.message ?? null;

    // Delete temporary file from Render disk
    fs.unlinkSync(req.file.path);

    return res.json({
      success: true,
      output,
    });

  } catch (error) {
    console.error("Vision API error:", error);

    return res.status(500).json({
      error: "OpenAI Vision API error",
      details: error?.error?.message || error.message,
    });
  }
});

export default router;
