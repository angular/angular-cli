import assert from 'node:assert/strict';
import { appendFile, readdir } from 'node:fs/promises';
import { getGlobalVariable } from '../../utils/env';
import { readFile, replaceInFile } from '../../utils/fs';
import {
  getActivePackageManager,
  installPackage,
  installWorkspacePackages,
} from '../../utils/packages';
import { execWithEnv, ng } from '../../utils/process';
import { isPrereleaseCli, updateJsonFile } from '../../utils/project';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  const isPrerelease = await isPrereleaseCli();
  let tag = isPrerelease ? '@next' : '';
  if (getActivePackageManager() === 'npm') {
    await appendFile('.npmrc', '\nlegacy-peer-deps=true');
  }

  await ng('add', `@angular/material${tag}`, '--skip-confirmation');

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  if (isSnapshotBuild) {
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      // Angular material adds dependencies on other Angular packages
      // Iterate over all of the packages to update them to the snapshot version.
      for (const [name, version] of Object.entries(snapshots.dependencies)) {
        if (name in dependencies) {
          dependencies[name] = version;
        }
      }

      dependencies['@angular/material-moment-adapter'] =
        snapshots.dependencies['@angular/material-moment-adapter'];
    });
    await installWorkspacePackages();
  } else {
    if (!tag) {
      const installedMaterialVersion = JSON.parse(await readFile('package.json'))['dependencies'][
        '@angular/material'
      ];
      tag = `@${installedMaterialVersion}`;
    }
    await installPackage(`@angular/material-moment-adapter${tag}`);
  }

  await installPackage('moment');

  await ng('build');

  // Ensure moment adapter works (uses unique importing mechanism for moment)
  // Issue: https://github.com/angular/angular-cli/issues/17320
  await replaceInFile(
    'src/app/app.config.ts',
    `import { ApplicationConfig } from '@angular/core';`,
    `
    import { ApplicationConfig } from '@angular/core';
    import {
      MomentDateAdapter,
      MAT_MOMENT_DATE_FORMATS
    } from '@angular/material-moment-adapter';
    import {
      DateAdapter,
      MAT_DATE_LOCALE,
      MAT_DATE_FORMATS
    } from '@angular/material/core';
  `,
  );

  await replaceInFile(
    'src/app/app.config.ts',
    `providers: [provideRouter(routes) ]`,
    `
    providers: [
      provideRouter(routes),
      {
        provide: DateAdapter,
        useClass: MomentDateAdapter,
        deps: [MAT_DATE_LOCALE]
      },
      {
        provide: MAT_DATE_FORMATS,
        useValue: MAT_MOMENT_DATE_FORMATS
      }
    ]
  `,
  );

  await ng('e2e', '--configuration=production');

  const usingApplicationBuilder = getGlobalVariable('argv')['esbuild'];
  if (usingApplicationBuilder) {
    // Test with chunk optimizations to reduce async animations chunk file count
    await execWithEnv('ng', ['build'], {
      ...process.env,
      NG_BUILD_OPTIMIZE_CHUNKS: '1',
    });
    const distFiles = await readdir('dist/test-project/browser');
    const jsCount = distFiles.filter((file) => file.endsWith('.js')).length;
    // 3 = polyfills, main, and one lazy chunk
    assert.equal(jsCount, 3);

    await execWithEnv('ng', ['e2e', '--configuration=production'], {
      ...process.env,
      NG_BUILD_OPTIMIZE_CHUNKS: '1',
    });
  }
}
