#!/usr/bin/env node
import { cpSync, existsSync, rmSync, watch } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { createPreviewServer } from './preview.mjs';

const SRC = resolve(fileURLToPath(new URL('../src', import.meta.url)));
const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const BACKUP = resolve(fileURLToPath(new URL('../.dist-backup', import.meta.url)));
let timer;
let building = false;
let rebuildQueued = false;
let closing = false;

build();
const server = createPreviewServer({ liveReload: true });

function rebuild() {
  if (building) {
    rebuildQueued = true;
    return;
  }

  building = true;
  rmSync(BACKUP, { recursive: true, force: true });
  if (existsSync(DIST)) cpSync(DIST, BACKUP, { recursive: true });
  try {
    build();
    rmSync(BACKUP, { recursive: true, force: true });
    server.reload();
  } catch (error) {
    rmSync(DIST, { recursive: true, force: true });
    if (existsSync(BACKUP)) cpSync(BACKUP, DIST, { recursive: true });
    rmSync(BACKUP, { recursive: true, force: true });
    console.error(`Build failed: ${error.message}`);
  } finally {
    building = false;
    if (rebuildQueued) {
      rebuildQueued = false;
      rebuild();
    }
  }
}

const watcher = watch(SRC, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 75);
});

function close() {
  if (closing) return;
  closing = true;
  clearTimeout(timer);
  watcher.close();
  server.closeLiveReloadClients();
  server.close(() => process.exit(0));
}

process.on('SIGINT', close);
process.on('SIGTERM', close);
