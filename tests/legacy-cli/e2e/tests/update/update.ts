import { appendFile } from 'fs/promises';
import { SemVer } from 'semver';
import { createProjectFromAsset } from '../../utils/assets';
import { expectFileMatchToExist, readFile } from '../../utils/fs';
import { getActivePackageManager } from '../../utils/packages';
import { ng, noSilentNg } from '../../utils/process';
import { isPrereleaseCli, useCIChrome, useCIDefaults, getNgCLIVersion } from '../../utils/project';

export default async function () {
  let restoreRegistry: (() => Promise<void>) | undefined;

  try {
    // We need to use the public registry because in the local NPM server we don't have
    // older versions @angular/cli packages which would cause `npm install` during `ng update` to fail.
    restoreRegistry = await createProjectFromAsset('12.0-project', true);

    // If using npm, enable legacy peer deps mode to avoid defects in npm 7+'s peer dependency resolution
    // Example error where 11.2.14 satisfies the SemVer range ^11.0.0 but still fails:
    // npm ERR! Conflicting peer dependency: @angular/compiler-cli@11.2.14
    // npm ERR! node_modules/@angular/compiler-cli
    // npm ERR!   peer @angular/compiler-cli@"^11.0.0 || ^11.2.0-next" from @angular-devkit/build-angular@0.1102.19
    // npm ERR!   node_modules/@angular-devkit/build-angular
    // npm ERR!     dev @angular-devkit/build-angular@"~0.1102.19" from the root project
    if (getActivePackageManager() === 'npm') {
      await appendFile('.npmrc', '\nlegacy-peer-deps=true');
    }

    // CLI project version
    const { version: cliVersion } = JSON.parse(
      await readFile('./node_modules/@angular/cli/package.json'),
    );
    const cliMajorProjectVersion = new SemVer(cliVersion).major;

    // CLI current version.
    const cliMajorVersion = getNgCLIVersion().major;

    for (let version = cliMajorProjectVersion + 1; version < cliMajorVersion; version++) {
      // Run all the migrations until the current build major version - 1.
      // Example: when the project is using CLI version 10 and the build CLI version is 14.
      // We will run the following migrations:
      // - 10 -> 11
      // - 11 -> 12
      // - 12 -> 13
      const { stdout } = await ng('update', `@angular/cli@${version}`, `@angular/core@${version}`);
      if (!stdout.includes("Executing migrations of package '@angular/cli'")) {
        throw new Error('Update did not execute migrations for @angular/cli. OUTPUT: \n' + stdout);
      }
      if (!stdout.includes("Executing migrations of package '@angular/core'")) {
        throw new Error('Update did not execute migrations for @angular/core. OUTPUT: \n' + stdout);
      }
    }
  } finally {
    await restoreRegistry?.();
  }

  // Update Angular current build
  const extraUpdateArgs = isPrereleaseCli() ? ['--next', '--force'] : [];

  // For the latest/next release we purposely don't run `ng update @angular/core`.

  // During a major release when the branch version is bumped from `12.0.0-rc.x` to `12.0.0` there would be a period were in
  // the local NPM registry `@angular/cli@latest` will point to `12.0.0`, but on the public NPM repository `@angular/core@latest` will be `11.2.x`.

  // This causes `ng update @angular/core` to fail because of mismatching peer dependencies.

  // The reason for this is because of our bumping and release strategy. When we release a major version on NPM we don't tag it
  // `@latest` right away, but we wait for all teams to release their packages before doing so. While this is good because all team
  // packages gets tagged with `@latest` at the same time. This is problematic for our CI, since we test against the public NPM repo and are dependent on tags.

  // NB: `ng update @angular/cli` will still cause `@angular/core` packages to be updated therefore we still test updating the core package without running the command.

  await ng('update', '@angular/cli', ...extraUpdateArgs);

  // Setup testing to use CI Chrome.
  await useCIChrome('twelve-project', './');
  await useCIChrome('twelve-project', './e2e/');
  await useCIDefaults('twelve-project');

  // Run CLI commands.
  await ng('generate', 'component', 'my-comp');
  await ng('test', '--watch=false');

  await ng('e2e');
  await ng('e2e', '--configuration=production');

  // Verify project now creates bundles
  await noSilentNg('build', '--configuration=production');
  await expectFileMatchToExist('dist/twelve-project/', /main\.[0-9a-f]{16}\.js/);
}
