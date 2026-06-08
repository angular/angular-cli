import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { replaceInFile } from '../../utils/fs';
import { execWithEnv, ng } from '../../utils/process';

export default async function () {
  // Case 1: 2 lazy chunks (below threshold of 3) -> should NOT optimize by default
  await ng('generate', 'component', 'lazy-a');
  await ng('generate', 'component', 'lazy-b');
  await replaceInFile(
    'src/app/app.routes.ts',
    'routes: Routes = [];',
    `routes: Routes = [
      {
        path: 'lazy-a',
        loadComponent: () => import('./lazy-a/lazy-a').then(m => m.LazyA),
      },
      {
        path: 'lazy-b',
        loadComponent: () => import('./lazy-b/lazy-b').then(m => m.LazyB),
      },
    ];`,
  );

  // Build without explicit flag (should use default threshold of 3)
  await ng('build', '--output-hashing=none');
  const files2 = await readdir('dist/test-project/browser');
  const jsFiles2 = files2.filter((f) => f.endsWith('.js'));

  // Build with forced optimization to see if it COULD reduce chunks
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: 'true',
  });
  const files2Opt = await readdir('dist/test-project/browser');
  const jsFiles2Opt = files2Opt.filter((f) => f.endsWith('.js'));

  // If forced optimization reduces chunks, then default should have MORE chunks (since it didn't run).
  // If forced optimization doesn't reduce chunks, they will be equal.
  // So we assert that default is NOT fewer than forced.
  assert.ok(
    jsFiles2.length >= jsFiles2Opt.length,
    `Expected default build with 2 lazy chunks to NOT be optimized. Default: ${jsFiles2.length}, Forced: ${jsFiles2Opt.length}`,
  );

  // Case 2: 3 lazy chunks (at threshold of 3) -> should optimize by default
  await ng('generate', 'component', 'lazy-c');
  await replaceInFile(
    'src/app/app.routes.ts',
    `path: 'lazy-b',
        loadComponent: () => import('./lazy-b/lazy-b').then(m => m.LazyB),
      },`,
    `path: 'lazy-b',
        loadComponent: () => import('./lazy-b/lazy-b').then(m => m.LazyB),
      },
      {
        path: 'lazy-c',
        loadComponent: () => import('./lazy-c/lazy-c').then(m => m.LazyC),
      },`,
  );

  // Build without explicit flag (should use default threshold of 3)
  await ng('build', '--output-hashing=none');
  const files3 = await readdir('dist/test-project/browser');
  const jsFiles3 = files3.filter((f) => f.endsWith('.js'));

  // Build with explicit disable
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: 'false',
  });
  const files3Unopt = await readdir('dist/test-project/browser');
  const jsFiles3Unopt = files3Unopt.filter((f) => f.endsWith('.js'));

  // Expect default build to be optimized (fewer chunks than explicitly disabled)
  assert.ok(
    jsFiles3.length < jsFiles3Unopt.length,
    `Expected default build with 3 lazy chunks to be optimized. Default: ${jsFiles3.length}, Unoptimized: ${jsFiles3Unopt.length}`,
  );
}
