import { execSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';

execSync('tsc -p tsconfig.json', { stdio: 'inherit' });
execSync('tsc -p tsconfig.cjs.json', { stdio: 'inherit' });

copyFileSync('dist/cjs/index.js', 'dist/index.cjs');
copyFileSync('dist/cjs/detectClient.js', 'dist/detectClient.cjs');
rmSync('dist/cjs', { recursive: true, force: true });
