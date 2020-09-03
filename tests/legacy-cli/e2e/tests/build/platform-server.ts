import { normalize } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, expectFileToMatch, writeFile } from '../../utils/fs';
import { exec, ng, silentNpm } from '../../utils/process';
import { isPrereleaseCli, updateJsonFile } from '../../utils/project';

const snapshots = require('../../ng-snapshot/package.json');

export default async function () {
  const argv = getGlobalVariable('argv');
  const veEnabled = argv['ve'];

  // @nguniversal/express-engine currently relies on ^0.1000.0 of @angular-devkit/architect
  // which is not present in the local package registry and not semver compatible with 0.1001.0+
  const { stdout: stdout1 } = await silentNpm('pack', '@angular-devkit/architect@0.1001', '--registry=https://registry.npmjs.org');
  await silentNpm('publish', stdout1.trim(), '--registry=http://localhost:4873', '--tag=minor');

  // @nguniversal/express-engine currently relies on ^10.0.0 of @angular-devkit/core
  // which is not present in the local package registry and not semver compatible prerelease version of 10.1.0
  const { stdout: stdout2 } = await silentNpm('pack', '@angular-devkit/core@10.1', '--registry=https://registry.npmjs.org');
  await silentNpm('publish', stdout2.trim(), '--registry=http://localhost:4873', '--tag=minor');

  const tag = (await isPrereleaseCli()) ? 'next' : 'latest';
  await ng('add', `@nguniversal/express-engine@${tag}`);

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
      await silentNpm('install', pkg);
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


  await ng('run', 'test-project:server:production', '--optimization', 'false');

  await expectFileToMatch('dist/test-project/server/main.js', veEnabled ? /exports.*AppServerModuleNgFactory/ : /exports.*AppServerModule/);
  await exec(normalize('node'), 'dist/test-project/server/main.js');
  await expectFileToMatch(
    'dist/test-project/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );

  // works with optimization and bundleDependencies enabled
  await ng('run', 'test-project:server:production', '--optimization', '--bundleDependencies');
  await exec(normalize('node'), 'dist/test-project/server/main.js');
  await expectFileToMatch(
    'dist/test-project/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );
}
