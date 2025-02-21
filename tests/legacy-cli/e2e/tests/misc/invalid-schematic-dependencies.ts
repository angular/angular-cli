import { join } from 'node:path';
import { expectFileToMatch } from '../../utils/fs';
import {
  execWithEnv,
  extractCIAndInfraEnv,
  extractNpmEnv,
  ng,
  silentNpm,
} from '../../utils/process';
import { getActivePackageManager, installPackage, uninstallPackage } from '../../utils/packages';
import { isPrereleaseCli } from '../../utils/project';
import { appendFile, writeFile } from 'node:fs/promises';
import { getGlobalVariable } from '../../utils/env';

export default async function () {
  // Must publish old version to local registry to allow install. This is especially important
  // for release commits as npm will try to request tooling packages that are not on the npm registry yet
  await publishOutdated('@schematics/angular@7');
  await publishOutdated('@angular-devkit/core@7');
  await publishOutdated('@angular-devkit/schematics@7');

  // Install outdated and incompatible version
  await installPackage('@schematics/angular@7');

  const isPrerelease = await isPrereleaseCli();
  const tag = isPrerelease ? '@next' : '';
  if (getActivePackageManager() === 'npm') {
    await appendFile('.npmrc', '\nlegacy-peer-deps=true');
  }

  await ng('add', `@angular/material${tag}`, '--skip-confirmation');
  await expectFileToMatch('package.json', /@angular\/material/);

  // Clean up existing cdk package
  // Not doing so can cause adding material to fail if an incompatible cdk is present
  await uninstallPackage('@angular/cdk');
}

async function publishOutdated(npmSpecifier: string): Promise<void> {
  const npmrc = join(getGlobalVariable('tmp-root'), '.npmrc-publish');
  const testRegistry = (getGlobalVariable('package-registry') as string).replace(/^\w+:/, '');
  await writeFile(
    npmrc,
    `
    ${testRegistry.replace(/^https?:/, '')}/:_authToken=fake-secret
    `,
  );

  const { stdout: stdoutPack } = await silentNpm(
    'pack',
    npmSpecifier,
    '--registry=https://registry.npmjs.org',
  );

  await execWithEnv('npm', ['publish', stdoutPack.trim(), '--tag=outdated'], {
    ...extractNpmEnv(),
    ...extractCIAndInfraEnv(),
    'NPM_CONFIG_USERCONFIG': npmrc,
  });
}
