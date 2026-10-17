/**
 * A tiny, dependency-free template engine.
 *
 * Syntax
 *   {{ site.name }}                 print a value (dotted path into the context)
 *   {{> header }}                   include src/partials/header.html
 *   {{#each nav}} ... {{/each}}     repeat for each array item; use {{ this.label }}
 *   {{#if page.flag}} ... {{else}} ... {{/if}}
 *
 * Values are inserted as-is (no HTML escaping): all content is written by us,
 * not by visitors. A missing value throws, so typos fail the build loudly
 * instead of shipping an empty gap.
 */

const TAG = /{{\s*([#/>]?)\s*([^}]*?)\s*}}/g;
const BLOCKS = new Set(['each', 'if']);

function block(kind, arg) {
  const children = [];
  const alt = [];
  return { type: 'block', kind, arg, children, alt, branch: children };
}

function parse(source, name) {
  const root = block('root');
  const stack = [root];
  let cursor = 0;

  const fail = (message) => {
    throw new Error(`${name}: ${message}`);
  };

  for (const match of source.matchAll(TAG)) {
    const [raw, sigil, body] = match;
    const open = stack.at(-1);

    if (match.index > cursor) {
      open.branch.push({ type: 'text', value: source.slice(cursor, match.index) });
    }
    cursor = match.index + raw.length;

    if (sigil === '#') {
      const [kind, arg] = body.split(/\s+/);
      if (!BLOCKS.has(kind) || !arg) fail(`unknown or incomplete block "{{#${body}}}"`);
      const node = block(kind, arg);
      open.branch.push(node);
      stack.push(node);
    } else if (sigil === '/') {
      if (stack.length === 1 || open.kind !== body) fail(`unexpected "{{/${body}}}"`);
      stack.pop();
    } else if (sigil === '>') {
      open.branch.push({ type: 'partial', name: body });
    } else if (body === 'else') {
      if (open.kind !== 'if') fail('"{{else}}" is only valid inside {{#if}}');
      open.branch = open.alt;
    } else {
      open.branch.push({ type: 'var', path: body });
    }
  }

  if (cursor < source.length) root.branch.push({ type: 'text', value: source.slice(cursor) });
  if (stack.length > 1) fail(`block "{{#${stack.at(-1).kind} ${stack.at(-1).arg}}}" is never closed`);
  return root;
}

function lookup(path, ctx, scope) {
  const [head, ...rest] = path.split('.');
  let value = head === 'this' ? scope.this : ctx[head];
  for (const key of rest) {
    if (value == null) break;
    value = value[key];
  }
  return value;
}

/**
 * @param {Record<string, string>} partials  partial name -> template source
 */
export function createRenderer(partials) {
  const cache = new Map();

  const ast = (source, name) => {
    if (!cache.has(name)) cache.set(name, parse(source, name));
    return cache.get(name);
  };

  function renderNodes(nodes, ctx, scope, name) {
    let out = '';
    for (const node of nodes) {
      switch (node.type) {
        case 'text':
          out += node.value;
          break;
        case 'var': {
          const value = lookup(node.path, ctx, scope);
          if (value === undefined) throw new Error(`${name}: missing value "${node.path}"`);
          out += value === null || value === false ? '' : String(value);
          break;
        }
        case 'partial': {
          const source = partials[node.name];
          if (source === undefined) throw new Error(`${name}: unknown partial "${node.name}"`);
          const label = `partial:${node.name}`;
          out += renderNodes(ast(source, label).branch, ctx, scope, label);
          break;
        }
        case 'block': {
          const value = lookup(node.arg, ctx, scope);
          if (node.kind === 'each') {
            if (!Array.isArray(value)) throw new Error(`${name}: "${node.arg}" is not a list`);
            for (const item of value) out += renderNodes(node.children, ctx, { this: item }, name);
          } else {
            const truthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
            out += renderNodes(truthy ? node.children : node.alt, ctx, scope, name);
          }
          break;
        }
      }
    }
    return out;
  }

  return function render(source, ctx, name = 'template') {
    return renderNodes(ast(source, name).children, ctx, { this: undefined }, name);
  };
}
