import assert from 'node:assert';
import { writeFile } from '../../../utils/fs';
import { getActivePackageManager, uninstallPackage } from '../../../utils/packages';
import { ng } from '../../../utils/process';
import { isPrereleaseCli, updateJsonFile } from '../../../utils/project';
import { appendFile } from 'node:fs/promises';
import { getGlobalVariable } from '../../../utils/env';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // forcibly remove in case another test doesn't clean itself up
  await uninstallPackage('@angular/material');

  const isPrerelease = await isPrereleaseCli();
  const tag = isPrerelease ? '@next' : '';
  if (getActivePackageManager() === 'npm') {
    await appendFile('.npmrc', '\nlegacy-peer-deps=true');
  }

  await ng('add', `@angular/material${tag}`, '--skip-confirmation');
  await Promise.all([
    updateJsonFile('angular.json', (workspaceJson) => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.styles = ['src/styles.scss'];
    }),
    writeFile('src/styles.scss', `@use 'pkg:@angular/material' as mat;`),
  ]);

  await ng('build');
}
