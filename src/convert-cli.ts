import { readFileSync, writeFileSync } from 'fs';
import { convertGlm } from './converter.js';

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('Usage: node dist/convert-cli.js <input.glm> <output.glm>');
  process.exit(1);
}

const data = new Uint8Array(readFileSync(inPath));
convertGlm(data);
writeFileSync(outPath, data);
console.log(`Written: ${outPath}`);
