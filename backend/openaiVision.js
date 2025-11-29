// backend/openaiVision.js
import fs from 'fs';
import axios from 'axios';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) console.warn('OpenAI key missing or no vision access');

export async function analyzeImage(filePath) {
  // This implementation reads the image and embeds it as a data URL into a prompt,
  // then calls the OpenAI "Responses" endpoint with a vision-capable model.
  // NOTE: Model name must be available in your account (e.g., 'gpt-4o-mini-vision' or similar).
  // If your account uses a different mechanism for image inputs, consult OpenAI docs and adapt.

  const data = fs.readFileSync(filePath);
  const b64 = data.toString('base64');

  // Model: adjust to one available to your key
  const model = 'gpt-4o-mini-vision';
  const instruction = `You are a helpful assistant that identifies food items on a plate and estimates portion sizes in grams or common measures. \
Return ONLY JSON — an array of items: [{"name":"...","portion":"...","confidence":0.0}]. Do not include extra commentary.`;

  const input = `data:image/jpeg;base64,${b64}`;

  const payload = {
    model,
    input: [
      { role: 'user', content: instruction + '\\n' + input }
    ]
  };

  const url = 'https://api.openai.com/v1/responses';
  try {
    const res = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });

    const output = res.data;
    // Try to extract text output
    try {
      const text = (output.output && output.output[0] && output.output[0].content && output.output[0].content[0] && output.output[0].content[0].text) || JSON.stringify(output);
      const json = JSON.parse(text);
      return { model: model, items: json, raw: output };
    } catch (e) {
      return { raw: output, note: 'Could not parse assistant output as JSON - see raw' };
    }
  } catch (err) {
    const msg = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error('OpenAI API error: ' + msg);
  }
}

export default { analyzeImage };
