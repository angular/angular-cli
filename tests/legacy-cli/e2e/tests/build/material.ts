import { getGlobalVariable } from '../../utils/env';
import { readFile, replaceInFile } from '../../utils/fs';
import { installPackage, installWorkspacePackages } from '../../utils/packages';
import { ng } from '../../utils/process';
import { isPrereleaseCli, updateJsonFile } from '../../utils/project';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  // `@angular/material` pre-release may not support the current version of `@angular/core` pre-release.
  // due to the order of releases FW -> CLI -> Material
  // In this case peer dependency ranges may not resolve causing npm 7+ to fail during tests.
  const original_NPM_CONFIG_legacy_peer_deps = process.env['NPM_CONFIG_legacy_peer_deps'];
  const isPrerelease = await isPrereleaseCli();

  let tag = isPrerelease ? '@next' : '';

  try {
    process.env['NPM_CONFIG_legacy_peer_deps'] = isPrerelease
      ? 'true'
      : original_NPM_CONFIG_legacy_peer_deps;

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
  } finally {
    process.env['NPM_CONFIG_legacy_peer_deps'] = original_NPM_CONFIG_legacy_peer_deps;
  }

  await ng('build');

  // Ensure moment adapter works (uses unique importing mechanism for moment)
  // Issue: https://github.com/angular/angular-cli/issues/17320
  await replaceInFile(
    'src/app/app.module.ts',
    `import { AppComponent } from './app.component';`,
    `
    import { AppComponent } from './app.component';
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
    'src/app/app.module.ts',
    `providers: []`,
    `
    providers: [
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
}
