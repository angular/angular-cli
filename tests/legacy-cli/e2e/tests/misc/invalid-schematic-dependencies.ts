import { expectFileToMatch } from '../../utils/fs';
import { execWithEnv, extractNpmEnv, ng, silentNpm } from '../../utils/process';
import { installPackage, uninstallPackage } from '../../utils/packages';
import { isPrereleaseCli } from '../../utils/project';

export default async function () {
  // Must publish old version to local registry to allow install. This is especially important
  // for release commits as npm will try to request tooling packages that are not on the npm registry yet
  await publishOutdated('@schematics/angular@7');
  await publishOutdated('@angular-devkit/core@7');
  await publishOutdated('@angular-devkit/schematics@7');

  // Install outdated and incompatible version
  await installPackage('@schematics/angular@7');

  const tag = (await isPrereleaseCli()) ? '@next' : '';
  await ng('add', `@angular/material${tag}`, '--skip-confirmation');
  await expectFileToMatch('package.json', /@angular\/material/);

  // Clean up existing cdk package
  // Not doing so can cause adding material to fail if an incompatible cdk is present
  await uninstallPackage('@angular/cdk');
}

async function publishOutdated(npmSpecifier: string): Promise<void> {
  const { stdout: stdoutPack } = await silentNpm(
    'pack',
    npmSpecifier,
    '--registry=https://registry.npmjs.org',
  );
  await execWithEnv('npm', ['publish', stdoutPack.trim(), '--tag=outdated'], {
    ...extractNpmEnv(),
    // Also set an auth token value for the local test registry which is required by npm 7+
    // even though it is never actually used.
    'NPM_CONFIG__AUTH': 'e2e-testing',
  });
}
