# Katalogit AI local demo

Run `npm install` and `npm run dev`, then open http://localhost:3000.

- `/` shows the animated landing page.
- `/#/demo` or `/#/studio` opens the local prototype studio without sign-in.
- Add a product by uploading one photo. Vision analysis identifies the product and drafts its listing. You can add more angles and seller notes before generating shots.
- AI image editing tries OpenAI, Gemini, then OpenRouter, always with the uploaded photo as a reference. If none has usable credit, a labelled local studio finish keeps the actual photo intact. The listing and all images can still be saved locally.
- Add `?auth=1#/studio` to exercise the Firebase sign-in path. Signed-in products use Firestore and Firebase Storage.
- `/mobile-upload?session=...` is the phone upload route.

Secrets go in the ignored `.env.local` file. The API keys are read by the server and are not embedded in the browser bundle. The `/api/ai/status` route reports the configured providers. API availability and account credit are confirmed only by an actual generation request.

Verification commands: `npm run lint`, `npm run build`, and `node scripts/e2e-product-flow.mjs --quick` with the local server running. The browser check uses installed Microsoft Edge and writes screenshots under ignored `artifacts/`.

Nothing in the local preview workflow pushes to GitHub or publishes the site.
