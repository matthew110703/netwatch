import { defineConfig, globalIgnores } from 'eslint/config';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextTs,
  globalIgnores([
    '.expo/**',
    'node_modules/**',
    'dist/**',
    'dist-*/**',
    'android/**',
    'ios/**',
    'scripts/**',
  ]),
]);
