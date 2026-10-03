import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'public/arl-assets/expense-ocr');
await mkdir(path.join(target, 'lang'), { recursive: true });
await copyFile(path.join(root, 'node_modules/tesseract.js/dist/worker.min.js'), path.join(target, 'worker.min.js'));
const core = path.join(root, 'node_modules/tesseract.js-core');
for (const file of await readdir(core)) {
  if (file.endsWith('.wasm.js') || file.endsWith('.wasm')) await copyFile(path.join(core, file), path.join(target, file));
}
await copyFile(path.join(root, 'node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz'), path.join(target, 'lang/por.traineddata.gz'));
await copyFile(path.join(root, 'node_modules/tesseract.js/LICENSE.md'), path.join(target, 'LICENSE-tesseract.txt'));
await copyFile(path.join(core, 'LICENSE'), path.join(target, 'LICENSE-core.txt'));
console.log('Leitor de faturas preparado com arquivos locais, sem CDN.');
