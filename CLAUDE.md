# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build static site for production (outputs to `/dist` directory)
- `npm run start` - Start production server (not used for static deployment)
- `npm run lint` - Run ESLint checks
- `npm run export` - Alias for build command (static export enabled by default)

## Architecture & Key Concepts

### Static Site Generation
This is a Next.js 15 application configured for **static export** via `next.config.js`. The entire app builds to static files in the `/dist` directory for deployment to GitHub Pages. All pages must be client-side rendered (`'use client'`) due to static export constraints.

### Data Management Philosophy
The application uses **local state management** with useState for immediate UI responsiveness, but is architected to support **dual data persistence**:

1. **Xano Database API** (recommended): REST API at `https://xuz0-tsfm-drds.n7.xano.io/api:VHWtgrOF` with full CRUD operations for shopping items
2. **Google Sheets Integration** (legacy): Original HTML version used Google Sheets API

The `ShoppingItem` type in `BabyShoppingChecklist.tsx` defines the core data structure with predefined categories (Sleep & Safety, Feeding, Diapers, etc.) and hardcoded default items covering essential baby supplies.

### Component Structure
- `src/app/layout.tsx` - Root layout with metadata
- `src/app/page.tsx` - Homepage wrapper (client component)
- `src/components/BabyShoppingChecklist.tsx` - Main application logic and UI

### Styling & UI
Uses **Tailwind CSS v4** with PostCSS via `@tailwindcss/postcss` plugin. The design mimics the original HTML styling with:
- Priority color coding (High=red, Medium=orange, Low=green)
- Category headers with blue backgrounds
- Responsive table layout
- Interactive form controls

### Deployment Pipeline
Automatic deployment via GitHub Actions (`.github/workflows/deploy.yml`):
- Triggers on pushes to `main` branch
- Runs `npm ci` and `npm run build` 
- Deploys static files from `/dist` to GitHub Pages
- Uses Node.js 18 runtime

## Integration Points

### API Integration
When implementing the Xano database connection:
- Shopping item schema uses different field names than the React component (e.g., `name` vs `item`, `status` enum values differ)
- No authentication required for API calls
- Supports standard REST operations: GET, POST, PATCH, DELETE

### Data Migration
The `defaultData` array contains comprehensive baby shopping items with categories. When connecting to external APIs, this serves as the seed data structure and demonstrates expected field relationships.

### Build Configuration
- **Output**: Static export (`output: 'export'`)
- **Dist Directory**: Custom `/dist` instead of default `/out`
- **Images**: Unoptimized for static hosting
- **Trailing Slash**: Enabled for GitHub Pages compatibility