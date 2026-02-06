# Portfolio Homepage

A single-page portfolio website built with SvelteKit 5, featuring a decorative garland line with interactive keychain tags, project sections with bento grids, and scroll animations.

## Tech Stack

- **SvelteKit 5** with Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- **Tailwind CSS v4** (CSS-first `@theme inline`, no `tailwind.config.js`)
- **TypeScript**
- **@sveltejs/adapter-static** for GitHub Pages deployment

## Architecture

### Configuration

All site-wide settings live in `site.config.json` at the repo root:

```json
{
  "meta": { "name": "...", "title": "...", "email": "...", ... },
  "colors": { "primary": "#...", "accent": "#...", "background": "#...", ... },
  "fonts": { "heading": "Inter", "body": "Inter" }
}
```

Colors are injected as `--cfg-*` CSS variables in `:root` (via `src/lib/utils/theme.ts`), then mapped to `--color-*` in `@theme inline` (in `src/app.css`) to avoid circular references with Tailwind.

### File Structure

```
src/
├── app.css                        # Tailwind imports, theme mapping, global styles
├── data/
│   └── projects.json              # Project content (see "Adding Projects" below)
├── lib/
│   ├── components/
│   │   ├── Nav.svelte             # Fixed nav bar with scroll blur
│   │   ├── Hero.svelte            # Full-viewport hero section
│   │   ├── GarlandLine.svelte     # Full-page SVG garland path with scroll animation
│   │   ├── GarlandTag.svelte      # Interactive keychain tags hanging from the line
│   │   ├── ProjectSection.svelte  # Individual project display with cover image
│   │   ├── BentoGrid.svelte       # Responsive image grid layout
│   │   ├── BentoTile.svelte       # Individual grid tile with scroll reveal
│   │   ├── TagPill.svelte         # Tag/category pill
│   │   ├── ContactForm.svelte     # Contact form section
│   │   └── Footer.svelte          # Footer with social links
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   └── utils/
│       ├── theme.ts               # Reads site.config.json, generates CSS vars
│       ├── garlandPath.ts         # SVG path generation and point sampling
│       └── scrollAnimation.ts     # IntersectionObserver scroll reveal action
├── routes/
│   ├── +layout.js                 # prerender = true
│   ├── +layout.svelte             # Global layout, CSS vars injection, meta tags
│   └── +page.svelte               # Main page assembly
static/
├── images/
│   ├── keychain-01.png            # Keychain tag variant 1 (blue key fob)
│   ├── keychain-02.png            # Keychain tag variant 2 (blue key fob)
│   ├── key-01.png                 # Brass key that dangles from ring
│   └── projects/
│       └── {project-id}/
│           ├── cover.webp         # Project cover image
│           └── detail-*.webp      # Detail images for bento grid
site.config.json                   # Colors, fonts, meta info
```

### Garland System

The decorative garland line spans the full page:

1. **`garlandPath.ts`** generates a Catmull-Rom spline that zigzags through the hero section, then flows in S-curves below
2. **`GarlandLine.svelte`** renders this as an SVG `<path>` with a scroll-driven stroke-dashoffset draw animation
3. **`GarlandTag.svelte`** places interactive keychain tags along the hero portion of the path

Tag distribution uses a grid-based approach:
- Detects zigzag rows by finding where the path's X-direction reverses
- Assigns evenly-spaced columns with a stride-2 shuffle to avoid diagonal alignment
- Computes the path tangent angle at each point for ring-line alignment

Each keychain tag features:
- Two PNG layers (ring-back at z:1, ring-front at z:10) with a garland line segment between them
- A project cover image visible through the transparent label window
- A brass key dangling from the ring hole with independent swing physics
- JS-driven idle sway with smooth blend-to-interaction on hover
- Spring physics for mouse interaction (stiffness: 0.08, damping: 0.88)
- A synced specular sheen on the cover image
- Project title overlay on hover

### Keychain Image Requirements

The keychain PNGs must be **square (1:1)** with **transparent backgrounds**. The label window must also be transparent (alpha = 0). Current positioning values are calibrated for the provided keychain images:

| Value | Purpose | Current |
|-------|---------|---------|
| `ring-back` clip | Top ring behind line | `inset(0 0 85% 0)` |
| `ring-front` clip | Body + ring front | `inset(8% 0 0 0)` |
| Cover position | Image in label window | `top:34% left:39% w:20% h:44%` |
| Ring-hole position | Key pivot point | `top:94px left:82px` (at 416px) |
| Pivot Y | Sway/push origin | `47px` |

To use different keychain images, these values need recalibrating to match the new images' window and hole positions.

### Custom SVG Path

The procedurally generated garland path can be replaced with a hand-drawn SVG path. The tag positioning system uses native SVG DOM methods (`getPointAtLength`, `getTotalLength`) that work with any `<path>` element. Replace `generateGarlandPath()` with your imported path `d` attribute string.

## Adding Projects

### 1. Add project images

Create a directory under `static/images/projects/{project-id}/`:

```
static/images/projects/my-project/
├── cover.webp          # Required: cover image (recommended 800x600+)
├── detail-01.webp      # Optional: bento grid images
├── detail-02.webp
└── ...
```

### 2. Add project entry

Add an object to `src/data/projects.json`:

```json
{
  "id": "my-project",
  "name": "My Project",
  "description": "Description of the project.",
  "role": "Lead Designer",
  "year": "2024",
  "client": "Client Name",
  "tags": ["UX Design", "Branding"],
  "cover": "/images/projects/my-project/cover.webp",
  "images": [
    {
      "src": "/images/projects/my-project/detail-01.webp",
      "alt": "Description of image",
      "tileSize": "large"
    },
    {
      "src": "/images/projects/my-project/detail-02.webp",
      "alt": "Description of image",
      "tileSize": "medium"
    }
  ],
  "externalUrl": "https://example.com",
  "featured": true
}
```

### Field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | URL-safe identifier, used as scroll anchor |
| `name` | string | Yes | Display name |
| `description` | string | Yes | Project description |
| `role` | string | Yes | Your role (empty string for non-project entries) |
| `year` | string | Yes | Year completed |
| `client` | string | No | Client name |
| `tags` | string[] | Yes | Category tags |
| `cover` | string | Yes | Path to cover image |
| `images` | ProjectImage[] | No | Bento grid detail images |
| `externalUrl` | string | No | Link to live project |
| `featured` | boolean | No | Show as garland tag in hero section |

### Tile sizes for bento grid images

- `"small"` — 1 column span
- `"medium"` — 2 column span
- `"large"` — full width

### 3. Featured projects

Set `"featured": true` to display a project as a keychain tag on the garland line in the hero section. The hero comfortably fits **5-7 tags** on desktop (5 zigzag rows at >= 1024px), **4-5 on tablet**, and **3-4 on mobile**. Mobile shows pill-style buttons instead of keychain tags.

### 4. Nav links

The Nav component (`src/lib/components/Nav.svelte`) has hardcoded scroll targets. Update `scrollTo()` calls if you change the first project's `id` or the section structure.

## Development

```bash
npm install
npm run dev          # Start dev server
npm run build        # Static build to /build
npm run preview      # Preview built site
```

### Customization

- **Colors/fonts**: Edit `site.config.json` — changes hot-reload in dev
- **Content**: Edit `src/data/projects.json`
- **Layout**: Components in `src/lib/components/`

## Deployment

Configured for GitHub Pages via `@sveltejs/adapter-static`. Set `BASE_PATH` environment variable for subdirectory deployments:

```bash
BASE_PATH=/repo-name npm run build
```
