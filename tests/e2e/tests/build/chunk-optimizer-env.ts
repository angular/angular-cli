import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { replaceInFile } from '../../utils/fs';
import { execWithEnv, ng } from '../../utils/process';
import { installPackage, uninstallPackage } from '../../utils/packages';

export default async function () {
  // Case 1: Force on with true/1 with 1 lazy chunk
  await ng('generate', 'component', 'lazy-a');
  await replaceInFile(
    'src/app/app.routes.ts',
    'routes: Routes = [];',
    `routes: Routes = [
      {
        path: 'lazy-a',
        loadComponent: () => import('./lazy-a/lazy-a').then(m => m.LazyA),
      },
    ];`,
  );

  // Build with forced optimization
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: 'true',
  });

  // Build with forced off
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: 'false',
  });

  // We just verify it runs without error.
  // With 1 chunk it might not be able to optimize further, so counts might be equal.

  // Case 2: Force off with false/0 with 3 lazy chunks
  await ng('generate', 'component', 'lazy-b');
  await ng('generate', 'component', 'lazy-c');
  await replaceInFile(
    'src/app/app.routes.ts',
    `path: 'lazy-a',
        loadComponent: () => import('./lazy-a/lazy-a').then(m => m.LazyA),
      },`,
    `path: 'lazy-a',
        loadComponent: () => import('./lazy-a/lazy-a').then(m => m.LazyA),
      },
      {
        path: 'lazy-b',
        loadComponent: () => import('./lazy-b/lazy-b').then(m => m.LazyB),
      },
      {
        path: 'lazy-c',
        loadComponent: () => import('./lazy-c/lazy-c').then(m => m.LazyC),
      },`,
  );

  // Build with forced off
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: 'false',
  });
  const files3Unopt = await readdir('dist/test-project/browser');
  const jsFiles3Unopt = files3Unopt.filter((f) => f.endsWith('.js'));

  // Build with default (should optimize because 3 chunks)
  await ng('build', '--output-hashing=none');
  const files3Default = await readdir('dist/test-project/browser');
  const jsFiles3Default = files3Default.filter((f) => f.endsWith('.js'));

  assert.ok(
    jsFiles3Default.length < jsFiles3Unopt.length,
    `Expected default build (3 chunks) to be optimized compared to forced off. Default: ${jsFiles3Default.length}, Forced Off: ${jsFiles3Unopt.length}`,
  );

  // Case 3: Custom threshold
  // Set threshold to 4 with 3 chunks -> should NOT optimize!
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: '4',
  });
  const files3Thresh4 = await readdir('dist/test-project/browser');
  const jsFiles3Thresh4 = files3Thresh4.filter((f) => f.endsWith('.js'));

  assert.ok(
    jsFiles3Thresh4.length >= jsFiles3Unopt.length,
    `Expected build with threshold 4 and 3 chunks to NOT be optimized. Thresh 4: ${jsFiles3Thresh4.length}, Unoptimized: ${jsFiles3Unopt.length}`,
  );

  // Case 4: Opt into Rolldown
  await installPackage('rolldown@1.0.0-rc.12');
  try {
    await execWithEnv('ng', ['build', '--output-hashing=none'], {
      ...process.env,
      NG_BUILD_CHUNKS_ROLLDOWN: '1',
      NG_BUILD_OPTIMIZE_CHUNKS: 'true',
    });
    const filesRolldown = await readdir('dist/test-project/browser');
    const jsFilesRolldown = filesRolldown.filter((f) => f.endsWith('.js'));

    assert.ok(jsFilesRolldown.length > 0, 'Expected Rolldown build to produce output files.');
  } finally {
    // Clean up
    await uninstallPackage('rolldown');
  }
}
