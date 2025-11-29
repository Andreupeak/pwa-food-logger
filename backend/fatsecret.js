// backend/fatsecret.js
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import axios from 'axios';

const consumerKey = process.env.FATSECRET_KEY;
const consumerSecret = process.env.FATSECRET_SECRET;
if (!consumerKey || !consumerSecret) {
  console.warn('FatSecret keys not configured (FATSECRET_KEY / FATSECRET_SECRET)');
}

const oauth = OAuth({
  consumer: { key: consumerKey || '', secret: consumerSecret || '' },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

const BASE = 'https://platform.fatsecret.com/rest/server.api';

export async function searchFoods(query) {
  // FatSecret expects OAuth 1.0a signed requests.
  // We will send a POST form request with method=foods.search.
  const request_data = {
    url: BASE,
    method: 'POST',
    data: {
      method: 'foods.search',
      format: 'json',
      search_expression: query
    }
  };

  const headers = oauth.toHeader(oauth.authorize(request_data));
  const params = new URLSearchParams();
  params.append('method','foods.search');
  params.append('search_expression',query);
  params.append('format','json');

  try {
    const res = await axios.post(BASE, params.toString(), { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }});
    return res.data;
  } catch (err) {
    const msg = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
    throw new Error('FatSecret API error: ' + msg);
  }
}

export default { searchFoods };
