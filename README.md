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

  <p align="center">
    From product photo to catalogue, social post, and storefront.
    <br />
    <a href="#getting-started"><strong>Get started locally »</strong></a>
    <br /><br />
    <a href="#usage">Explore the workflow</a>
    &middot;
    <a href="https://github.com/Atharv777/Katalogit/issues">Report a bug</a>
    &middot;
    <a href="https://github.com/Atharv777/Katalogit/issues">Request a feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About the Project</a>
      <ul><li><a href="#built-with">Built With</a></li></ul>
    </li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#ai-configuration">AI Configuration</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#development">Development</a></li>
    <li><a href="#deployment">Deployment</a></li>
    <li><a href="#project-status">Project Status</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About the Project

Katalogit is an AI-assisted product catalogue studio for sellers. Upload a product photo, draft a listing from what the AI sees, create product imagery, and manage the result in one workspace. The same catalogue can supply downloadable social posts, a CSV export, and a standalone HTML storefront.

The current app opens a prototype studio without sign-in. Products and photos are stored in the browser using `localStorage` and data URLs. AI requests run through an Express API so provider credentials stay on the server.

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

See [package.json](package.json) for dependency versions and scripts.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Git.
- Node.js 22.12 or newer, with npm, to satisfy the tooling dependencies.
- A Gemini or OpenRouter API key for photo analysis and listing generation. Image generation also requires an available image provider and model access.

You can explore the interface and bundled examples without AI credentials; photo analysis requires a configured provider.

### Installation

1. Clone the repository and enter its directory:

   ```sh
   git clone https://github.com/Atharv777/Katalogit.git
   cd Katalogit
   ```

2. Install dependencies from the lockfile:

   ```sh
   npm ci
   ```

3. Copy the environment template:

   ```sh
   cp .env.example .env.local
   ```

   On Windows, copy `.env.example` to `.env.local` using your file manager or shell equivalent.

4. Edit `.env.local` and add your provider credentials. For example:

   ```dotenv
   GEMINI_API_KEY=your_gemini_api_key
   APP_URL=http://localhost:3000
   ```

   Check the model settings in the copied file against models available to your provider account. The repository's model names are configurable defaults, not a guarantee of access.

5. Start the application:

   ```sh
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

### AI Configuration

Credentials are loaded from the ignored `.env.local` file by the local server. Restart the server after changing them.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini photo analysis, listing/caption generation, and image editing; `GOOGLE_API_KEY` is also accepted |
| `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL` | Override Gemini model IDs |
| `OPENROUTER_API_KEY` | Alternative provider for text, vision, and image requests |
| `OPENROUTER_TEXT_MODEL`, `OPENROUTER_IMAGE_MODEL` | Override OpenRouter model IDs |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Enable Cloudflare Workers AI image editing |
| `OPENAI_API_KEY` | Enable OpenAI image editing |
| `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY` | Configure OpenAI image requests |
| `APP_URL` | Application URL used in OpenRouter request metadata |
| `PORT` | Local server port; defaults to `3000` |

Photo analysis and social copy try Gemini and then OpenRouter when configured. Image generation tries configured providers in this order: Cloudflare, Gemini, OpenAI, and OpenRouter. Availability, credits, and model access affect whether a request succeeds.

[http://localhost:3000/api/ai/status](http://localhost:3000/api/ai/status) reports provider configuration. It does not verify credits or successful generation. See [.env.example](.env.example) and [server/ai.ts](server/ai.ts) for the configuration details and implementation.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

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

For local phone uploads, both devices must be able to reach the development server over the network. Use the QR-generated address rather than the phone's `localhost`.

Social content is downloaded or copied for manual sharing. The website builder exports an HTML file; publishing that file requires separate hosting.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

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

## Deployment

The repository includes Vercel configuration: the frontend builds to `dist/`, `/api/*` requests route to the Express function in `api/index.ts`, and `/mobile-upload` serves the app entry point. Configure provider secrets in the hosting environment.

For a Node-hosted build, install dependencies, build the frontend, and run the server in production mode:

```sh
npm run build
NODE_ENV=production npm run dev
```

The environment assignment above uses Unix shell syntax. The server still uses `tsx`, so that dependency must be available at runtime.

Phone upload sessions are stored in server memory. On Vercel, requests may reach different function instances, making phone handoff best-effort; persistent shared session storage is needed for reliable multi-instance deployment.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Project Status

Katalogit currently exposes a local prototype workflow. Browser storage is device-specific, limited by browser quota, and cleared when site data is removed.

Firebase authentication, Firestore product services, Storage helpers, and access rules exist in the repository. However, the active `App.tsx` supplies a prototype user and does not mount `AuthGate`. The `?auth=1` path mentioned in older preview notes is not wired into the current app. Enabling account-backed persistence requires connecting the authentication flow and configuring your own Firebase project.

See the [open issues](https://github.com/Atharv777/Katalogit/issues) for reported problems and proposed improvements.

## Contributing

To propose a change, open an issue describing the problem or submit a focused pull request.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Make your changes and run `npm run lint`, `npm test`, and `npm run build`.
4. Commit and push to your fork.
5. Open a pull request describing the change and how you verified it.

## License

Several source files include `SPDX-License-Identifier: Apache-2.0` headers. This checkout does not contain a repository-level `LICENSE` file; confirm the intended project-wide license with the maintainer.

## Contact

Repository owner: [Atharv777](https://github.com/Atharv777)

Project: [Katalogit](https://github.com/Atharv777/Katalogit)

Questions and bug reports: [GitHub Issues](https://github.com/Atharv777/Katalogit/issues)

## Acknowledgments

- [Best-README-Template](https://github.com/othneildrew/Best-README-Template) for this README's structure.
- [Shields.io](https://shields.io) for repository badges.
- The maintainers of the libraries and tools listed in [Built With](#built-with).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/Atharv777/Katalogit.svg?style=for-the-badge
[contributors-url]: https://github.com/Atharv777/Katalogit/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Atharv777/Katalogit.svg?style=for-the-badge
[forks-url]: https://github.com/Atharv777/Katalogit/network/members
[stars-shield]: https://img.shields.io/github/stars/Atharv777/Katalogit.svg?style=for-the-badge
[stars-url]: https://github.com/Atharv777/Katalogit/stargazers
[issues-shield]: https://img.shields.io/github/issues/Atharv777/Katalogit.svg?style=for-the-badge
[issues-url]: https://github.com/Atharv777/Katalogit/issues
