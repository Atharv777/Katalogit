<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<br />
<div align="center">
  <a href="https://github.com/Atharv777/Katalogit">
    <img src="public/favicon.svg" alt="Katalogit logo" width="80" height="80">
  </a>

  <h1 align="center">Katalogit AI</h1>

</div>


## About the Project

Katalogit is an AI-assisted product catalogue studio for sellers. Upload a product photo, draft a listing from what the AI sees, create product imagery, and manage the result in one workspace. The same catalogue can supply downloadable social posts, a CSV export, and a standalone storefront website.

The current app opens a prototype studio without sign-in. Products and photos are stored using Firebase. AI requests run through an Express API so provider credentials stay on the server.

### Features

- **Shop onboarding:** Set up a shop profile before entering the studio.
- **Photo capture:** Upload from your computer or transfer a phone photo through a QR-based session.
- **AI listing drafts:** Analyze a product photo to suggest listing details, with seller notes and category-specific guidance.
- **Product imagery:** Generate images using the uploaded photo as a reference. When AI editing is unavailable, the capture flow can apply a labelled studio finish that preserves the original photo.
- **Catalogue management:** Review and edit products, manage draft/review/active statuses, and export filtered records as CSV.
- **Social content:** Create captions and post images, download the image, and copy the caption for sharing.
- **Storefront export:** Choose products, customize a shop name and accent color, preview the page, and download an HTML website.
- **Interactive presentation:** Animated landing page, 3D visuals, and an in-app walkthrough.

### Built With

| Area | Technologies |
| --- | --- |
| Languages | TypeScript, TSX, CSS, HTML, and JavaScript utility scripts |
| Frontend | React 19, Vite 6, Tailwind CSS 4 |
| Animation and 3D | Motion, GSAP, Three.js, React Three Fiber, Drei |
| Server | Node.js, Express 4, tsx |
| AI integrations | Google Gemini, Cloudflare Workers AI, OpenAI, OpenRouter |
| Data and authentication support | Firebase Authentication, Cloud Firestore, Firebase Storage; browser storage in the active prototype |
| Images and UI utilities | Sharp, Lucide React, QRCode |
| Development checks | TypeScript, Vitest, fast-check, Playwright |

<p align="right">(<a href="#readme-top"> </a>)</p>


## Usage

1. Open the landing page and complete the shop assessment.
2. Enter the studio and add a product photo. Use a local upload or the phone capture flow.
3. Review the photo analysis, supply seller details, and generate product shots.
4. Check the listing and images before saving the product to your catalogue.
5. Use the catalogue tools to review products, download a CSV, create social content, or export a storefront.

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/#/assessment` | Shop onboarding |
| `/#/studio` | Studio; asks for a shop profile first |
| `/#/demo` | Studio with walkthrough; asks for a shop profile first |
| `/mobile-upload?session=...` | Phone upload page for a generated session |

For local phone uploads, both devices must be able to reach the development server over the network. Use the QR-generated address.

Social content is downloaded or copied for manual sharing. The website builder exports an HTML file;

<p align="right">(<a href="#readme-top"> </a>)</p>

## Development

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express with Vite development middleware |
| `npm run build` | Build the frontend into `dist/` |
| `npm run preview` | Preview the frontend build; does not start the Express API |
| `npm run lint` | Run TypeScript checks with `tsc --noEmit` |
| `npm test` | Run the Vitest suite once |
| `npm run clean` | Remove `dist/` using a Unix shell command |

The `scripts/` directory also contains browser and smoke-check utilities. Some assume Microsoft Edge, generated local fixtures, or earlier UI flows; inspect their prerequisites before using them.

### Project Structure

```text
Katalogit/
├── src/
│   ├── App.tsx              # Landing, onboarding, and studio routing
│   ├── CatalogApp.tsx       # Catalogue workspace and tools
│   ├── components/          # Capture, review, export, social, and storefront UI
│   ├── lib/                 # API clients, local storage, Firebase, and image helpers
│   └── types.ts             # Product data types
├── shared/categories.ts    # Category definitions and image prompts
├── server/                 # AI provider integrations and API routes
├── server.ts               # Local Express server and phone sessions
├── api/index.ts            # Vercel Express function
├── public/                 # Branding, example images, and walkthrough assets
├── scripts/                # Preview, smoke, and browser-check utilities
├── firestore.rules         # Firestore access rules
├── storage.rules           # Firebase Storage access rules
└── vercel.json             # Build and routing configuration
```
<p align="right">(<a href="#readme-top"> </a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/Atharv777/Katalogit.svg?style=for-the-badge
[contributors-url]: https://github.com/Atharv777/Katalogit/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Atharv777/Katalogit.svg?style=for-the-badge
[forks-url]: https://github.com/Atharv777/Katalogit/network/members
[stars-shield]: https://img.shields.io/github/stars/Atharv777/Katalogit.svg?style=for-the-badge
[stars-url]: https://github.com/Atharv777/Katalogit/stargazers
[issues-shield]: https://img.shields.io/github/issues/Atharv777/Katalogit.svg?style=for-the-badge
[issues-url]: https://github.com/Atharv777/Katalogit/issues
