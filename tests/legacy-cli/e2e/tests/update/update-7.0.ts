import { createProjectFromAsset } from '../../utils/assets';
import {
  expectFileMatchToExist,
  expectFileToExist,
  expectFileToMatch,
  writeFile,
} from '../../utils/fs';
import { ng, noSilentNg, silentNpm } from '../../utils/process';
import { isPrereleaseCli, useBuiltPackages, useCIChrome, useCIDefaults } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  await createProjectFromAsset('7.0-project', true);
  // Update Angular.
  await ng('update', '@angular/core@8', '@angular/cli@8', '--force');
  await ng('update', '@angular/core@9', '@angular/cli@9', '--force');

  // Test CLI migrations.
  // Should update the lazy route syntax via update-lazy-module-paths.
  await expectFileToMatch(
    'src/app/app-routing.module.ts',
    `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`,
  );

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
  await writeFile('.npmrc', 'registry = http://localhost:4873', 'utf8');
  await silentNpm('install');

  const extraUpdateArgs = (await isPrereleaseCli()) ? ['--next', '--force'] : [];
  await ng('update', '@angular/core@10', '@angular/cli@10', ...extraUpdateArgs);

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
