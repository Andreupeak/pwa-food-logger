# PWA Food Logger (Vanilla JS + Tailwind)

Personal PWA to test Spoonacular, FatSecret, Edamam (Food DB, Nutrition Analysis, Recipe Search / Meal Planner), and OpenAI Vision.


## Deploy to Render
1. Push this repo to GitHub.
2. On Render, create a **New → Web Service**, connect your GitHub repo.
3. Start command: `npm start`
4. Add environment variables in Render (see `.env.example`) — **do not commit real keys**.

## Notes
- FatSecret uses OAuth 1.0a (consumer key/secret). The server includes signed requests with oauth-1.0a.
- OpenAI Vision: the backend sends the image as base64 in a prompt to a vision-capable Responses model; if your account uses a different pattern, adjust as noted in `backend/openaiVision.js`.
- Edamam endpoints used:
- Food DB parser: `https://api.edamam.com/api/food-database/v2/parser`
- Nutrition details: `https://api.edamam.com/api/nutrition-details`
- Recipe search: `https://api.edamam.com/api/recipes/v2`
- For any API errors, check provider docs for required plan permissions and quotas.
