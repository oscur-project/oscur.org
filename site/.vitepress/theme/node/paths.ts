import path from 'node:path'
import { fileURLToPath } from 'node:url'

// This file lives in site/.vitepress/theme/node. Vite injects the original import.meta.url both when it
// bundles the config and when it loads a data loader, so the paths below hold in either context.
export const SITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
export const DATA_DIR = path.join(SITE_DIR, 'data')
export const PUBLIC_DIR = path.join(SITE_DIR, 'public')
export const NEWS_DIR = path.join(SITE_DIR, 'news')
// Written by scripts/impact/collect.mjs (npm run impact); not committed.
export const IMPACT_METRICS = path.join(SITE_DIR, '..', '.cache', 'impact', 'metrics.json')
