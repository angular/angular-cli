import { getGlobalVariable } from '../../utils/env';
import { replaceInFile } from '../../utils/fs';
import { installPackage, installWorkspacePackages } from '../../utils/packages';
import { ng } from '../../utils/process';
import { isPrereleaseCli, updateJsonFile } from '../../utils/project';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  const tag = await isPrereleaseCli() ?  '@next' : '';
  await ng('add', `@angular/material${tag}`);

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
    await installPackage('@angular/material-moment-adapter@11');
  }

  await installPackage('moment');

  await ng('build', '--prod');

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

  await ng('e2e', '--prod');
}
