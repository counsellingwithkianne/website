# Counselling with Kianne

A prototype website for **Counselling with Kianne**, the online counselling practice of Kianne Coltman, Specialist Wellness Counsellor, in South Africa. It is a small static site: plain HTML and CSS, no framework, no JavaScript, and nothing collected from visitors.

The design follows the brand brief: warm cream and gold, handwritten and botanical touches, calm by default. One main action runs through every page: **Book a free 15-minute call**, which opens a pre-filled WhatsApp message.

## Pages

| Page | File |
| --- | --- |
| Home | `src/pages/index.html` |
| About | `src/pages/about.html` |
| My approach | `src/pages/approach.html` |
| How I can help | `src/pages/help.html` |
| Fees and booking | `src/pages/fees.html` |
| Contact (with the privacy note) | `src/pages/contact.html` |

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer. There is nothing to install.

```bash
npm run dev       # build, then preview at http://localhost:4173
npm run build     # build only, output goes to dist/
npm run preview   # preview an existing dist/ build
```

`npm run dev` watches `src/`, rebuilds after each change and reloads open browser tabs. The build also checks every link, image and font reference, and fails if one is broken.

## How it is organised

```
.
├── .github/workflows/deploy.yml   Build and deploy to GitHub Pages
├── scripts/
│   ├── build.mjs                  The build (pages + CSS + assets + link check)
│   ├── dev.mjs                    Local watcher and live reload
│   ├── preview.mjs                Tiny local server for dist/
│   └── lib/                       Template engine and link checker
└── src/
    ├── data/site.json             Global constants: contact details, nav, credentials
    ├── layouts/base.html          The shared <html> shell and <head> tags
    ├── partials/                  Header, footer, call band, sticky mobile button
    ├── pages/                     One file per page, with title and description
    ├── css/
    │   ├── tokens.css             Colours, fonts, sizes, spacing (the design system)
    │   ├── base.css               Fonts, reset, typography, buttons
    │   ├── layout.css             Container, sections, split rows, shapes
    │   └── components.css         Header, footer, cards, FAQ, and so on
    ├── assets/images, fonts/      WebP images and self-hosted fonts
    └── public/                    Copied to the site root (.nojekyll, CNAME)
```

### Global constants

Anything that appears in more than one place lives in one file, so it can't drift out of sync:

- **`src/data/site.json`** holds the phone number, email, Instagram handle, WhatsApp message, Psychology Today link, qualification and membership lines, the urgent-help paragraph and the navigation. The build turns these into the WhatsApp link, `mailto:` link and so on. Change a value once and every page updates.
- **`src/css/tokens.css`** holds every colour, font size, space and radius as a CSS custom property. Change `--color-bronze` and every button and price changes with it.

### Templates

Pages use a tiny built-in template syntax (see `scripts/lib/template.mjs`):

```html
{{ site.contact.email }}                  print a value
{{> call-band }}                          include src/partials/call-band.html
{{#each nav}} {{ this.label }} {{/each}}  repeat over a list
{{#if page.flag}} ... {{else}} ... {{/if}}
```

A missing value fails the build, so a typo can't quietly ship an empty gap.

## Common edits

**Change copy.** Edit the page in `src/pages/`. The text is plain HTML.

**Change a page's browser title or search description.** Edit the front matter at the top of the page (`title`, `description`). The build warns if they run past about 60 and 155 characters.

**Add a page.** Create `src/pages/new-page.html` with front matter (`title`, `description`, `nav`). To put it in the menu, add an entry to `nav` in `src/data/site.json`.

Export photos as WebP (about 1200px on the long side keeps them light), and always give `width`, `height` and meaningful `alt` text.

## Deploying to GitHub Pages

1. Push this repository to GitHub, with the default branch named `main`.
2. In the repository, go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The **Deploy to GitHub Pages** workflow builds the site and publishes it. The live address appears on the workflow run and under Settings > Pages, usually `https://<user>.github.io/<repo>/`.

Pull requests run the build only, as a check, and don't publish. All paths in the site are relative, so it works under a repository sub-path as well as on a custom domain.

### Custom domain

To serve it from `counsellingwithkianne.co.za` once the domain is registered, create `src/public/CNAME` containing just the domain name, point the domain's DNS at GitHub Pages ([instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)), then set the domain under Settings > Pages.

## Before going live

This is a prototype for feedback, so a few things are set up to be safe:

- [x] **Search indexing is enabled.** The build creates `robots.txt` and `sitemap.xml` from the canonical URL. Set `"noindex": true` in `src/data/site.json` to block indexing on a future private preview.
- [ ] **Confirm the logo wording.** The supplied logo reads "Counselling & Psychometry". The original brief asked for "Specialist Wellness Counsellor" only, until registration is complete. Confirm with Kianne, and swap `src/assets/images/logo.webp` if needed. The home page still shows "Specialist Wellness Counsellor" as its label.
- [x] **Replace the photo placeholders** with the portrait session photos.
- [ ] **Re-check the helpline numbers** in `src/data/site.json` at [sadag.org](https://www.sadag.org).
- [ ] **Confirm `url`** in `src/data/site.json` matches the final domain (used for canonical and social-share tags).
- [ ] The hero and call-band photos are mood images, not photos of Kianne. Swap for her own if she prefers.

## Design notes

- **Mobile first.** Layouts are fluid grids that stack on phones; body text never drops below 17px. A sticky call button appears on phones.
- **Accessible.** Text meets 4.5:1 contrast (the darker rose and bronze are used for text, the lighter protea rose only for decoration), there is a skip link, visible focus states, real buttons and links, and descriptive alt text. The menu and FAQ use native `<details>`, so they work with the keyboard and without JavaScript.
- **Calm.** No autoplay, pop-ups or loud animation. The only motion is a slow fade on page headings, switched off for visitors who prefer reduced motion.
- **Private.** Fonts are self-hosted, so visitors' browsers make no requests to Google. There is no contact form, analytics or cookies. If any are added later, update the privacy note on the Contact page.
- **Fast.** One small stylesheet (cache-busted by content hash), WebP images with explicit dimensions, and lazy loading below the fold.

## Credits

Fonts: [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant) and [Jost](https://github.com/indestructible-type/Jost), both under the SIL Open Font License (licences in `src/assets/fonts/`). Logo, botanical illustrations and photographs belong to their respective owners and are included for this prototype only.
