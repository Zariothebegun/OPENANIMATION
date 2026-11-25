// Compila o motor de renderização 3D (three.js + pós-processamento) para um único bundle de browser.
import esbuild from 'esbuild'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
await esbuild.build({ entryPoints: [path.join(here, 'web/main.ts')], bundle: true, format: 'iife', outfile: path.join(here, 'dist/sf.js'), target: 'es2022', logLevel: 'error' });
console.log('cinema bundle ok');
