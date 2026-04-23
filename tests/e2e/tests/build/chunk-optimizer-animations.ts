import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { getGlobalVariable } from '../../utils/env';
import { readFile, writeFile } from '../../utils/fs';
import { installPackage } from '../../utils/packages';
import { execWithEnv } from '../../utils/process';
import { readNgVersion } from '../../utils/version';

export default async function () {
  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  let animationsSpecifier: string;
  if (isSnapshotBuild) {
    const snapshots = require('../../ng-snapshot/package.json');
    animationsSpecifier = snapshots.dependencies['@angular/animations'];
  } else {
    const coreVersion = readNgVersion();
    animationsSpecifier = `@angular/animations@${coreVersion}`;
  }

  // Install @angular/animations package
  await installPackage(animationsSpecifier);

  // Configure app.config.ts with provideAnimationsAsync
  const originalConfig = await readFile('src/app/app.config.ts');
  await writeFile(
    'src/app/app.config.ts',
    `
    import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
    ${originalConfig.replace(/providers:\s*\[/, 'providers: [provideAnimationsAsync(),')}
  `,
  );

  const updatedConfig = await readFile('src/app/app.config.ts');
  assert.ok(
    updatedConfig.includes('provideAnimationsAsync()'),
    'Expected src/app/app.config.ts to include provideAnimationsAsync().',
  );

  // Build with chunk optimization
  await execWithEnv('ng', ['build', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_OPTIMIZE_CHUNKS: '1',
  });
  const optimizedFiles = await readdir('dist/test-project/browser');
  const optimizedJsFiles = optimizedFiles.filter((f) => f.endsWith('.js'));

  // Read the optimized main.js file
  const mainCode = await readFile('dist/test-project/browser/main.js');

  // Check that optimized chunks still contain more than 1 javascript file
  assert.ok(
    optimizedJsFiles.length > 1,
    `Expected more than one chunk, but found ${optimizedJsFiles.length}.`,
  );

  // Check that one of the lazy loaded chunks contains the animations package code
  let foundAnimationsChunk = false;
  for (const file of optimizedJsFiles) {
    if (file === 'main.js') {
      continue;
    }
    const code = await readFile(`dist/test-project/browser/${file}`);
    if (code.includes('AnimationEngine')) {
      foundAnimationsChunk = true;
      break;
    }
  }

  assert.ok(
    foundAnimationsChunk,
    'Expected to find AnimationEngine in one of the optimized lazy chunks.',
  );

  // The animations engine should not be bundled in main.js
  assert.ok(
    !mainCode.includes('AnimationEngine'),
    'Expected main.js not to contain AnimationEngine from @angular/animations/browser.',
  );
}
