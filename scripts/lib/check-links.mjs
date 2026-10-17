import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // https:, mailto:, data:, //cdn...

/**
 * Verifies every local href/src in the built HTML (and url() in the built CSS)
 * points at a file that exists, and that #fragments point at a real id.
 * Returns a list of human-readable problems; empty means all good.
 */
export function checkLinks(distDir, htmlFiles, cssFiles = []) {
  const problems = [];
  const htmlCache = new Map();
  const read = (file) => {
    if (!htmlCache.has(file)) htmlCache.set(file, readFileSync(file, 'utf8'));
    return htmlCache.get(file);
  };

  const verify = (fromFile, ref) => {
    if (!ref || EXTERNAL.test(ref)) return;
    const [pathAndQuery, hash] = ref.split('#');
    const [pathPart] = pathAndQuery.split('?');
    const target = pathPart ? resolve(dirname(fromFile), pathPart) : fromFile;
    const shown = relative(distDir, fromFile);

    if (!existsSync(target)) {
      problems.push(`${shown}: "${ref}" does not exist`);
      return;
    }
    if (hash && target.endsWith('.html') && !read(target).includes(`id="${hash}"`)) {
      problems.push(`${shown}: "${ref}" points to a missing #${hash}`);
    }
  };

  for (const file of htmlFiles) {
    for (const [, ref] of read(file).matchAll(/\s(?:href|src)="([^"]*)"/g)) verify(file, ref);
  }
  for (const file of cssFiles) {
    for (const [, ref] of readFileSync(file, 'utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      verify(file, ref);
    }
  }
  return problems;
}
