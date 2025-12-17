import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { replaceInFile } from '../../utils/fs';
import { execWithEnv, ng } from '../../utils/process';

export default async function () {
  // Add lazy routes.
  await ng('generate', 'component', 'lazy-a');
  await ng('generate', 'component', 'lazy-b');
  await ng('generate', 'component', 'lazy-c');
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
      {
        path: 'lazy-c',
        loadComponent: () => import('./lazy-c/lazy-c').then(m => m.LazyC),
      },
    ];`,
  );

  // Build without chunk optimization
  await ng('build', '--output-hashing=none');
  const unoptimizedFiles = await readdir('dist/test-project/browser');
  const unoptimizedJsFiles = unoptimizedFiles.filter((f) => f.endsWith('.js'));

  // Build with chunk optimization
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: '1',
  });
  const optimizedFiles = await readdir('dist/test-project/browser');
  const optimizedJsFiles = optimizedFiles.filter((f) => f.endsWith('.js'));

  // Check that the number of chunks is reduced but not all combined
  assert.ok(
    optimizedJsFiles.length < unoptimizedJsFiles.length,
    `Expected chunk count to be less than ${unoptimizedJsFiles.length}, but was ${optimizedJsFiles.length}.`,
  );
  assert.ok(
    optimizedJsFiles.length > 1,
    `Expected more than one chunk, but found ${optimizedJsFiles.length}.`,
  );
}
