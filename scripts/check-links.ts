import fs from 'node:fs';
import path from 'node:path';
import {
  BAIT_TIERS,
  FISH_CATALOG,
  ROD_TIERS,
} from '../src/shared/gameConfig.js';
import { CHARACTER_MODELS } from '../src/shared/definitions/vipDefinitions.js';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

let checkedCount = 0;
const errors: string[] = [];

function verifyPublicAsset(assetPath: string | undefined, label: string) {
  if (!assetPath) return;
  checkedCount++;
  const normalized = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  const fullPath = path.join(PUBLIC_DIR, normalized);
  if (!fs.existsSync(fullPath)) {
    errors.push(`[MISSING ASSET] ${label}: "${assetPath}" not found at ${fullPath}`);
    return;
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile() || stat.size === 0) {
    errors.push(`[EMPTY ASSET] ${label}: "${assetPath}" is empty or not a file`);
  }
}

console.log('🔍 Checking all game assets, sprites & documentation links...');

// 1. Check all 22 Fish Species sprites
for (const fish of FISH_CATALOG) {
  verifyPublicAsset(fish.imageUrl, `Fish(${fish.id})`);
}

// 2. Check all 10 Rod Tier sprites
for (const rod of ROD_TIERS) {
  verifyPublicAsset(rod.rodSpriteUrl, `Rod(${rod.id})`);
  if (rod.spriteUrl) {
    verifyPublicAsset(rod.spriteUrl, `RodCharSprite(${rod.id})`);
  }
}

// 3. Check all 6 Bait Tier sprites
for (const bait of BAIT_TIERS) {
  verifyPublicAsset(bait.imageUrl, `Bait(${bait.id})`);
}

// 4. Check all 10 Character Models (clean + bling WebP/PNG)
for (const model of CHARACTER_MODELS) {
  verifyPublicAsset(model.cleanUrl, `CharacterClean(${model.id})`);
  verifyPublicAsset(model.blingWebpUrl, `CharacterBlingWebp(${model.id})`);
  verifyPublicAsset(model.blingPngUrl, `CharacterBlingPng(${model.id})`);
}

// 5. Check markdown & HTML links in index.html and README.md
const filesToScan = ['index.html', 'README.md'];
const markdownLinkRegex = /\[[^\]]*\]\(([^)]+)\)/g;

for (const relFile of filesToScan) {
  const filePath = path.join(ROOT_DIR, relFile);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');

  let match: RegExpExecArray | null;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const rawTarget = match[1].trim().split('#')[0];
    if (!rawTarget) continue;
    checkedCount++;

    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://')) {
      try {
        new URL(rawTarget);
      } catch {
        errors.push(`[INVALID URL] in ${relFile}: "${rawTarget}"`);
      }
    } else if (!rawTarget.startsWith('mailto:')) {
      const targetPath = path.resolve(path.dirname(filePath), rawTarget);
      if (!fs.existsSync(targetPath)) {
        errors.push(`[BROKEN LOCAL LINK] in ${relFile}: "${rawTarget}"`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`❌ Link & Asset Verification Failed (${errors.length} errors):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`✅ Verified ${checkedCount} asset paths and links with 0 errors!`);
