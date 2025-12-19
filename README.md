# Chromecat

Browser-based tools for building and validating AEM Edge Delivery blocks with pixel-perfect accuracy.

## Overview

Chromecat provides a suite of browser-based tools for:
- **Visual Comparison**: Compare your EDS implementation against live websites using Pixelmatch
- **Block Development**: Edit block code with Monaco Editor and live preview
- **Region-Based Matching**: Fine-tune comparison regions with visual Y-offset adjustments
- **GitHub Integration**: Push block changes directly to your EDS repository

## Environments

- Preview: https://main--chromecat-2--{owner}.aem.page/
- Live: https://main--chromecat-2--{owner}.aem.live/
- Tools: https://main--chromecat-2--{owner}.aem.live/tools/

## Quick Start

```bash
# Install dependencies
npm install

# Start local development server
npx aem up

# Open tools
open http://localhost:3000/tools/
```

## Tools

### Visual Compare (`/tools/visual-compare.html`)

Compare your EDS blocks against a live website:
1. Enter the source URL (live website) and test URL (your EDS page)
2. Click "Compare" to run pixel comparison
3. View results in the diff viewer with side-by-side, overlay, or diff-only modes
4. Adjust region offsets using the region editor

### Block Editor (`/tools/block-editor.html`)

Edit blocks with Monaco Editor:
1. Select a block from the dropdown
2. Edit JavaScript, CSS, or test HTML
3. Preview changes instantly in the live preview pane
4. Save changes locally or sync to GitHub

## Blocks

### Implementation Blocks (VAC Demo)

| Block | Description |
|-------|-------------|
| `vac-hero-carousel` | Hero carousel with rotating slides |
| `vac-quick-links` | Quick action bar with icons |
| `vac-product-cards` | Product showcase cards |
| `vac-text-columns` | Multi-column text layout |
| `vac-news-cards` | News article cards |
| `vac-footer` | Multi-column footer |

### Tool Blocks

| Block | Description |
|-------|-------------|
| `url-scraper` | URL input form for comparison |
| `diff-viewer` | Visual comparison viewer |
| `results-dashboard` | Test results table |
| `region-editor` | Y-offset region tuning |
| `block-editor` | Monaco-based code editor |
| `preview-pane` | Live block preview |
| `project-manager` | Project selection UI |

## Cloudflare Workers API

The backend API runs on Cloudflare Workers with Browser Rendering for screenshots.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scrape` | POST | Fetch and analyze a webpage |
| `/api/screenshot` | POST | Capture page screenshots |
| `/api/compare` | POST | Run pixelmatch comparison |
| `/api/github/sync` | POST | Push blocks to GitHub |
| `/api/projects` | GET/POST | Manage projects |

### Deployment

```bash
cd workers
npm install
wrangler login

# Create resources
wrangler d1 create chromecat-db
wrangler r2 bucket create chromecat-screenshots
wrangler kv:namespace create KV

# Update wrangler.toml with generated IDs

# Run migrations
wrangler d1 execute chromecat-db --file=./schema.sql

# Deploy
wrangler deploy
```

## Project Structure

```
chromecat-2/
├── blocks/                    # EDS blocks
│   ├── vac-*/                 # Virgin Atlantic Cargo blocks
│   ├── url-scraper/           # URL input block
│   ├── diff-viewer/           # Comparison viewer
│   ├── results-dashboard/     # Results table
│   ├── region-editor/         # Region offset tuning
│   ├── block-editor/          # Monaco editor
│   ├── preview-pane/          # Live preview
│   └── project-manager/       # Project management
├── tools/                     # Tool pages
│   ├── index.html             # Tools landing page
│   ├── visual-compare.html    # Visual comparison tool
│   ├── block-editor.html      # Block development tool
│   └── mock-api.js            # Mock API for local dev
├── test/                      # Test pages
│   ├── vac-homepage.html      # VAC demo page
│   └── vac-visual-test.js     # Pixelmatch test script
├── workers/                   # Cloudflare Workers
│   ├── src/                   # TypeScript source
│   │   ├── index.ts           # API routes
│   │   ├── types.ts           # Type definitions
│   │   └── api/               # API handlers
│   ├── wrangler.toml          # Workers config
│   ├── schema.sql             # D1 schema
│   └── package.json           # Dependencies
├── scripts/                   # EDS scripts
├── styles/                    # EDS styles
└── STATUS.md                  # Implementation status
```

## Visual Comparison Workflow

1. **Fetch Source**: Scrape the original website
2. **Take Screenshots**: Capture full-page screenshots of both sites
3. **Define Regions**: Set Y-offset regions for comparison
4. **Compare**: Run Pixelmatch on each region
5. **Iterate**: Adjust CSS and region offsets until diff < 10%

### Region Configuration

```javascript
const regions = [
  { name: 'quick-links', liveYStart: 660, testYStart: 420, height: 100 },
  { name: 'products', liveYStart: 770, testYStart: 580, height: 440 },
  { name: 'text-columns', liveYStart: 1300, testYStart: 1100, height: 280 },
  { name: 'news', liveYStart: 1640, testYStart: 1450, height: 350 },
  { name: 'footer', liveYStart: 2100, testYStart: 1900, height: 180 },
];
```

## Development

### Local Development

```bash
# Start EDS dev server
npx aem up

# Start Workers dev server (optional)
cd workers && npm run dev
```

### Linting

```bash
npm run lint
```

### Type Checking (Workers)

```bash
cd workers && npm run typecheck
```

## Technologies

- **AEM Edge Delivery Services**: Block-based content delivery
- **Cloudflare Workers**: Serverless API backend
- **Cloudflare Browser Rendering**: Headless Chrome for screenshots
- **Cloudflare R2**: Screenshot storage
- **Cloudflare D1**: SQLite database
- **Pixelmatch**: Pixel-level image comparison
- **Monaco Editor**: VS Code editor in browser
- **Playwright/Puppeteer**: Browser automation

## Documentation

- [AEM Edge Delivery Services](https://www.aem.live/docs/)
- [Developer Tutorial](https://www.aem.live/developer/tutorial)
- [Block Development](https://www.aem.live/developer/block-collection)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Browser Rendering API](https://developers.cloudflare.com/browser-rendering/)

## License

MIT
