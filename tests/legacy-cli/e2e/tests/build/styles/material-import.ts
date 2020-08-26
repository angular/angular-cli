import { stripIndents } from 'common-tags';
import { getGlobalVariable } from '../../../utils/env';
import {
  replaceInFile,
  writeMultipleFiles,
} from '../../../utils/fs';
import { ng, silentNpm } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

const snapshots = require('../../../ng-snapshot/package.json');

export default async function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  await updateJsonFile('package.json', packageJson => {
    const dependencies = packageJson['dependencies'];
    dependencies['@angular/material'] = isSnapshotBuild ? snapshots.dependencies['@angular/material'] : 'latest';
    dependencies['@angular/cdk'] = isSnapshotBuild ? snapshots.dependencies['@angular/cdk'] : 'latest';
  });

  await silentNpm('install');

  for (const ext of ['css', 'scss', 'less', 'styl']) {
    await writeMultipleFiles({
      [`src/styles.${ext}`]: stripIndents`
        @import "~@angular/material/prebuilt-themes/indigo-pink.css";
      `,
      [`src/app/app.component.${ext}`]: stripIndents`
        @import "~@angular/material/prebuilt-themes/indigo-pink.css";
      `,
    });

    // change files to use preprocessor
    await updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.styles = [
        { input: `src/styles.${ext}` },
      ];
    });

    await replaceInFile('src/app/app.component.ts', './app.component.css', `./app.component.${ext}`);

    // run build app
    await ng('build', '--extract-css', '--source-map');
    await writeMultipleFiles({
      [`src/styles.${ext}`]: stripIndents`
          @import "@angular/material/prebuilt-themes/indigo-pink.css";
        `,
      [`src/app/app.component.${ext}`]: stripIndents`
          @import "@angular/material/prebuilt-themes/indigo-pink.css";
        `,
    });

    await ng('build', '--extract-css');
  }
}
