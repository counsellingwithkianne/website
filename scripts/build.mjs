#!/usr/bin/env node
/**
 * Static site build. Zero dependencies, Node 20+.
 *
 *   src/pages/*.html      page bodies with a small front-matter block
 *   src/layouts/base.html the shared <html> shell
 *   src/partials/*.html   header, footer, call band, ...
 *   src/data/site.json    global constants (contact details, nav, credentials)
 *   src/css/*.css         concatenated and minified into one stylesheet
 *   src/assets/**         copied as-is (images, fonts)
 *   src/public/**         copied to the site root (.nojekyll, CNAME, robots.txt)
 *
 * Output goes to dist/, ready to publish on GitHub Pages or any static host.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLinks } from './lib/check-links.mjs';
import { createRenderer } from './lib/template.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

/** Stylesheets in cascade order. */
const CSS_FILES = ['tokens.css', 'base.css', 'layout.css', 'components.css'];

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

/** Read a text file with LF line endings, even if git checked it out as CRLF. */
const readText = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const listFiles = (dir, extension) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(extension))
    .sort();

// --- Site data ------------------------------------------------------------

function loadSite() {
  const site = JSON.parse(readText(join(SRC, 'data', 'site.json')));
  const { contact } = site;

  // The pre-filled message opens a WhatsApp chat with Kianne.
  const message = encodeURIComponent(contact.whatsappMessage).replace(/'/g, '%27');

  return {
    ...site,
    whatsappUrl: `https://wa.me/${contact.whatsappNumber}?text=${message}`,
    instagramUrl: `https://www.instagram.com/${contact.instagramHandle}`,
    mailto: `mailto:${contact.email}`,
    year: new Date().getFullYear(),
  };
}

// --- CSS ------------------------------------------------------------------

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function buildCss() {
  const source = CSS_FILES.map((name) => readText(join(SRC, 'css', name))).join('\n');
  const css = minifyCss(source);
  // The content hash busts browser caches whenever the styles change.
  const hash = createHash('sha1').update(css).digest('hex').slice(0, 8);

  const dir = join(DIST, 'assets', 'css');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'styles.css'), css);
  return `assets/css/styles.css?v=${hash}`;
}

// --- Pages ----------------------------------------------------------------

function parsePage(source, file) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error(`${file}: missing front matter (--- title, description, nav ---)`);

  const meta = {};
  for (const line of match[1].split('\n').filter(Boolean)) {
    const colon = line.indexOf(':');
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  for (const key of ['title', 'description']) {
    if (!meta[key]) throw new Error(`${file}: front matter needs "${key}"`);
  }
  if (meta.title.length > TITLE_MAX) {
    console.warn(`  ! ${file}: title is ${meta.title.length} chars (aim for under ${TITLE_MAX})`);
  }
  if (meta.description.length > DESCRIPTION_MAX) {
    console.warn(`  ! ${file}: description is ${meta.description.length} chars (aim for under ${DESCRIPTION_MAX})`);
  }
  return { meta, body: source.slice(match[0].length) };
}

// --- Build ----------------------------------------------------------------

function build() {
  const started = performance.now();
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  const site = loadSite();
  const cssHref = buildCss();

  const partials = Object.fromEntries(
    listFiles(join(SRC, 'partials'), '.html').map((file) => [
      basename(file, '.html'),
      readText(join(SRC, 'partials', file)),
    ]),
  );
  const layout = readText(join(SRC, 'layouts', 'base.html'));
  const render = createRenderer(partials);

  const pageFiles = listFiles(join(SRC, 'pages'), '.html');
  const written = [];

  for (const file of pageFiles) {
    const { meta, body } = parsePage(readText(join(SRC, 'pages', file)), file);
    const slug = basename(file, '.html');
    const path = file === 'index.html' ? '' : file;

    const context = {
      site,
      page: { ...meta, slug, url: `${site.url}/${path}`, ogImage: `${site.url}/assets/images/og-image.jpg` },
      nav: site.nav.map((item) => ({ ...item, active: item.key === meta.nav })),
      assets: { css: cssHref },
    };

    context.content = render(body, context, `page:${file}`);
    const html = render(layout, context, 'layout:base');
    writeFileSync(join(DIST, file), html);
    written.push(join(DIST, file));
  }

  cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });
  if (existsSync(join(SRC, 'public'))) cpSync(join(SRC, 'public'), DIST, { recursive: true });

  const problems = checkLinks(DIST, written, [join(DIST, 'assets', 'css', 'styles.css')]);
  if (problems.length) {
    console.error(`\nBroken references:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    process.exit(1);
  }

  const ms = Math.round(performance.now() - started);
  console.log(`Built ${pageFiles.length} pages to dist/ in ${ms}ms. All links resolve.`);
}

build();
