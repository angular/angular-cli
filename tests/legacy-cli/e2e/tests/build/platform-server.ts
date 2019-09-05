import { normalize } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, writeFile } from '../../utils/fs';
import { exec, ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { readNgVersion } from '../../utils/version';

export default async function () {
  const argv = getGlobalVariable('argv');
  const veEnabled = argv['ve'];

  await ng('add', '@nguniversal/express-engine', '--client-project', 'test-project');

  await updateJsonFile('package.json', packageJson => {
    const dependencies = packageJson['dependencies'];
    dependencies['@angular/platform-server'] = getGlobalVariable('argv')['ng-snapshots']
      ? 'github:angular/platform-server-builds'
      : readNgVersion();
  });

  await silentNpm('install');
  if (veEnabled) {
    await writeFile(
      './index.js',
      ` require('zone.js/dist/zone-node');
        const fs = require('fs');
        const { AppServerModuleNgFactory, renderModuleFactory } = require('./dist/server/main');

        renderModuleFactory(AppServerModuleNgFactory, {
          url: '/',
          document: '<app-root></app-root>'
        }).then(html => {
          fs.writeFileSync('dist/server/index.html', html);
        });
        `,
    );
  } else {
    await writeFile(
      './index.js',
      ` require('zone.js/dist/zone-node');
        const fs = require('fs');
        const { AppServerModule, renderModule } = require('./dist/server/main');

        renderModule(AppServerModule, {
          url: '/',
          document: '<app-root></app-root>'
        }).then(html => {
          fs.writeFileSync('dist/server/index.html', html);
        });
        `,
    );
  }


  await ng('run', 'test-project:server:production');

  await expectFileToMatch('dist/server/main.js', veEnabled ? /exports.*AppServerModuleNgFactory/ : /exports.*AppServerModule/);
  await exec(normalize('node'), 'index.js');
  await expectFileToMatch(
    'dist/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );

  // works with optimization and bundleDependencies enabled
  await ng('run', 'test-project:server:production', '--optimization', '--bundleDependencies', 'all');
  await exec(normalize('node'), 'index.js');
  await expectFileToMatch(
    'dist/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );
}
