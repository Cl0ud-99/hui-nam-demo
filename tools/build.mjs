// tools/build.mjs — 打包 src/ -> dist/bundle.js
import * as esbuild from 'esbuild';
import fs from 'node:fs';

const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'dist/bundle.js',
  minify: false,
  sourcemap: false,
  legalComments: 'eof',
  logLevel: 'info',
  metafile: true,
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log('watching src/ ...');
} else {
  const res = await esbuild.build(opts);
  const out = res.metafile.outputs['dist/bundle.js'];
  console.log(`\ndist/bundle.js  ${(out.bytes / 1024).toFixed(0)} KB`);
}
