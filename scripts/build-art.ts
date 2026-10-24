import { readFileSync, writeFileSync } from 'node:fs';
import { websiteSprites } from '../src/ship-art.js';
const {version}=JSON.parse(readFileSync('package.json','utf8'));
writeFileSync('site/art.json', JSON.stringify({source:'null-invaders',version,sprites:websiteSprites},null,2)+'\n');
