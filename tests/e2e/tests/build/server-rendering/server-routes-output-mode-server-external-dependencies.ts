import assert from 'node:assert';
import { ng } from '../../../utils/process';
import { installWorkspacePackages, uninstallPackage } from '../../../utils/packages';
import { updateJsonFile, useSha } from '../../../utils/project';
import { getGlobalVariable } from '../../../utils/env';

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Forcibly remove in case another test doesn't clean itself up.
  await uninstallPackage('@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');
  await useSha();
  await installWorkspacePackages();

  await updateJsonFile('angular.json', (json) => {
    const build = json['projects']['test-project']['architect']['build'];
    build.options.externalDependencies = [
      '@angular/platform-browser',
      '@angular/core',
      '@angular/router',
      '@angular/common',
      '@angular/common/http',
      '@angular/platform-browser/animations',
    ];
  });

  await ng('build');
}
