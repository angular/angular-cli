import { normalize } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, expectFileToMatch, replaceInFile, writeFile } from '../../utils/fs';
import { installPackage } from '../../utils/packages';
import { exec, ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  const argv = getGlobalVariable('argv');
  const veEnabled = argv['ve'];

  await ng('generate', 'universal', '--client-project', 'test-project');

  const isSnapshotBuild = getGlobalVariable('argv')['ng-snapshots'];
  if (isSnapshotBuild) {
    const packagesToInstall = [];
    await updateJsonFile('package.json', (packageJson) => {
      const dependencies = packageJson['dependencies'];
      // Iterate over all of the packages to update them to the snapshot version.
      for (const [name, version] of Object.entries(snapshots.dependencies)) {
        if (name in dependencies && dependencies[name] !== version) {
          packagesToInstall.push(version);
        }
      }
    });

    for (const pkg of packagesToInstall) {
      await installPackage(pkg);
    }
  }

  if (veEnabled) {
    // todo: https://github.com/angular/angular-cli/issues/15851
    // We need to fix the 'export_ngfactory' transformer as with the
    // new universal approach the factory is not exported.
    await appendToFile(
      './src/main.server.ts',
      `export { AppServerModuleNgFactory } from './app/app.server.module.ngfactory'`,
    );

    await writeFile(
      './server.ts',
      ` import 'zone.js/dist/zone-node';
        import * as fs from 'fs';
        import { AppServerModuleNgFactory, renderModuleFactory } from './src/main.server';

        renderModuleFactory(AppServerModuleNgFactory, {
          url: '/',
          document: '<app-root></app-root>'
        }).then(html => {
          fs.writeFileSync('dist/test-project/server/index.html', html);
        });
        `,
    );
  } else {
    await writeFile(
      './server.ts',
      ` import 'zone.js/dist/zone-node';
        import * as fs from 'fs';
        import { AppServerModule, renderModule } from './src/main.server';

        renderModule(AppServerModule, {
          url: '/',
          document: '<app-root></app-root>'
        }).then(html => {
          fs.writeFileSync('dist/test-project/server/index.html', html);
        });
        `,
    );
  }

  await replaceInFile('tsconfig.server.json', 'src/main.server.ts', 'server.ts');
  await replaceInFile('angular.json', 'src/main.server.ts', 'server.ts');

  await ng('run', 'test-project:server', '--optimization', 'false');

  if (veEnabled) {
    await expectFileToMatch('dist/test-project/server/main.js', /exports.*AppServerModuleNgFactory|"AppServerModuleNgFactory":/);
  } else {
    await expectFileToMatch('dist/test-project/server/main.js', /exports.*AppServerModule|"AppServerModule":/);
  }
  await exec(normalize('node'), 'dist/test-project/server/main.js');
  await expectFileToMatch(
    'dist/test-project/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );

  // works with optimization and bundleDependencies enabled
  await ng('run', 'test-project:server', '--optimization', '--bundleDependencies');
  await exec(normalize('node'), 'dist/test-project/server/main.js');
  await expectFileToMatch(
    'dist/test-project/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );
}
