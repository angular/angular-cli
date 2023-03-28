import { normalize } from 'path';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileToMatch, replaceInFile, writeFile } from '../../../utils/fs';
import { installPackage } from '../../../utils/packages';
import { exec, ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

const snapshots = require('../../../ng-snapshot/package.json');

export default async function () {
  await ng('generate', 'application', 'test-project-two', '--standalone', '--skip-install');
  await ng('generate', 'universal', '--project', 'test-project-two');

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  if (isSnapshotBuild) {
    const packagesToInstall: string[] = [];
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      // Iterate over all of the packages to update them to the snapshot version.
      for (const [name, version] of Object.entries<string>(snapshots.dependencies)) {
        if (name in dependencies && dependencies[name] !== version) {
          packagesToInstall.push(version);
        }
      }
    });

    for (const pkg of packagesToInstall) {
      await installPackage(pkg);
    }
  }

  await writeFile(
    './projects/test-project-two/server.ts',
    `   import 'zone.js/node';
        import * as fs from 'fs';
        import { renderApplication } from '@angular/platform-server';
        import bootstrap from './src/main.server';

        renderApplication(bootstrap, {
          url: '/',
          document: '<app-root></app-root>'
        }).then(html => {
          fs.writeFileSync('dist/test-project-two/server/index.html', html);
        })
        `,
  );

  await replaceInFile(
    './projects/test-project-two/tsconfig.server.json',
    'src/main.server.ts',
    'server.ts',
  );
  await replaceInFile('angular.json', 'src/main.server.ts', 'server.ts');

  await ng('run', 'test-project-two:server', '--optimization', 'false');
  await exec(normalize('node'), 'dist/test-project-two/server/main.js');
  await expectFileToMatch(
    'dist/test-project-two/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );

  // works with optimization
  await ng('run', 'test-project-two:server', '--optimization');
  await exec(normalize('node'), 'dist/test-project-two/server/main.js');
  await expectFileToMatch(
    'dist/test-project-two/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );
}
