import { normalize } from 'path';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, writeFile } from '../../utils/fs';
import { exec, ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { readNgVersion } from '../../utils/version';

export default async function () {
  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return;
  }

  await ng('add', '@nguniversal/express-engine', '--client-project', 'test-project');

  await updateJsonFile('package.json', packageJson => {
    const dependencies = packageJson['dependencies'];
    dependencies['@angular/platform-server'] = getGlobalVariable('argv')['ng-snapshots']
      ? 'github:angular/platform-server-builds'
      : readNgVersion();
  });

  await silentNpm('install');
  await ng('run', 'test-project:server:production');
  await expectFileToMatch('dist/server/main.js', /exports.*AppServerModuleNgFactory/);

  await writeFile(
    './index.js',
    ` require('zone.js/dist/zone-node');
      const fs = require('fs');
      const { AppServerModuleNgFactory } = require('./dist/server/main');
      const { renderModuleFactory } = require('@angular/platform-server');

      renderModuleFactory(AppServerModuleNgFactory, {
        url: '/',
        document: '<app-root></app-root>'
      }).then(html => {
        fs.writeFileSync('dist/server/index.html', html);
      });
      `,
  );

  await exec(normalize('node'), 'index.js');
  await expectFileToMatch(
    'dist/server/index.html',
    /<p.*>Here are some links to help you get started:<\/p>/,
  );
}
