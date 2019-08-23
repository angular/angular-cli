import * as fs from 'fs';
import { createProjectFromAsset } from '../../utils/assets';
import { expectFileMatchToExist, expectFileToExist, expectFileToMatch } from '../../utils/fs';
import { ng, noSilentNg, silentNpm } from '../../utils/process';
import { isPrereleaseCli, useBuiltPackages, useCIChrome, useCIDefaults } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function() {
  const extraUpdateArgs = (await isPrereleaseCli()) ? ['--next', '--force'] : [];

  // Create new project from previous version files.
  // We must use the original NPM packages to force a real update.
  await createProjectFromAsset('7.0-project', true);
  fs.writeFileSync('.npmrc', 'registry = http://localhost:4873', 'utf8');

  // Update the CLI.
  // Users of CLI <7.2 will see the following warnings:
  //   packageGroup metadata of package @angular/cli is malformed. Ignoring.
  // This is expected since the format changed in 7.2.
  await ng('update', '@angular/cli', ...extraUpdateArgs);

  // Test CLI migrations.
  // Should update the lazy route syntax via update-lazy-module-paths.
  await expectFileToMatch(
    'src/app/app-routing.module.ts',
    `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`,
  );
  // Should update tsconfig and src/browserslist via differential-loading.
  await expectFileToMatch('tsconfig.json', `"target": "es2015",`);
  await expectToFail(() => expectFileToExist('e2e/browserlist'));
  // Should rename codelyzer rules.
  await expectFileToMatch('tslint.json', `use-lifecycle-interface`);
  // Unnecessary es6 polyfills should be removed via drop-es6-polyfills.
  await expectToFail(() => expectFileToMatch('src/polyfills.ts', `import 'core-js/es6/symbol';`));
  await expectToFail(() => expectFileToMatch('src/polyfills.ts', `import 'core-js/es6/set';`));

  // Use the packages we are building in this commit, and CI Chrome.
  await useBuiltPackages();
  await useCIChrome('src/');
  await useCIChrome('e2e/');
  await useCIDefaults('seven-oh-project');
  await silentNpm('install');

  // Update Angular.
  await ng('update', '@angular/core', ...extraUpdateArgs);

  // Run CLI commands.
  await ng('generate', 'component', 'my-comp');
  await ng('test', '--watch=false');
  await ng('lint');
  await ng('e2e');
  await ng('e2e', '--prod');

  // Verify project now creates bundles for differential loading.
  await noSilentNg('build', '--prod');
  await expectFileMatchToExist('dist/seven-oh-project/', /main-es5\.[0-9a-f]{20}\.js/);
  await expectFileMatchToExist('dist/seven-oh-project/', /main-es2015\.[0-9a-f]{20}\.js/);
}
