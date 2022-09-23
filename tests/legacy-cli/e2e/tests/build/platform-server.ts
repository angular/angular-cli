import { normalize } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { installPackage } from '../../utils/packages';
import { exec, ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  await ng('generate', 'universal', '--project', 'test-project');

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
    './server.ts',
    ` import 'zone.js/dist/zone-node';
        import * as fs from 'fs';
        import { renderModule } from '@angular/platform-server';
        import { AppServerModule } from './src/main.server';

        renderModule(AppServerModule, {
          url: '/',
          document: '<app-root></app-root>'
        }).then(html => {
          fs.writeFileSync('dist/test-project/server/index.html', html);
        });
        `,
  );

  await replaceInFile('tsconfig.server.json', 'src/main.server.ts', 'server.ts');
  await replaceInFile('angular.json', 'src/main.server.ts', 'server.ts');

  await ng('run', 'test-project:server', '--optimization', 'false');

  await expectFileToMatch(
    'dist/test-project/server/main.js',
    /exports.*AppServerModule|"AppServerModule":/,
  );
  await exec(normalize('node'), 'dist/test-project/server/main.js');
  await expectFileToMatch(
    'dist/test-project/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );

  // works with optimization
  await ng('run', 'test-project:server', '--optimization');
  await exec(normalize('node'), 'dist/test-project/server/main.js');
  await expectFileToMatch(
    'dist/test-project/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );
}
