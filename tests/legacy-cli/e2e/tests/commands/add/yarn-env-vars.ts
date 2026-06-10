import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getGlobalVariable } from '../../../utils/env';
import { expectFileNotToExist, expectFileToExist } from '../../../utils/fs';
import { getActivePackageManager } from '../../../utils/packages';
import { git, ng } from '../../../utils/process';
import { VALID_TOKEN } from '../../../utils/registry';

export default async function () {
  // Yarn specific test that tests YARN_ env variables.
  // https://classic.yarnpkg.com/en/docs/envvars/
  if (getActivePackageManager() !== 'yarn') {
    return;
  }
  const command = ['add', '@angular/pwa', '--skip-confirmation'];

  // Clean up any potential env vars first
  delete process.env['NPM_CONFIG_REGISTRY'];
  delete process.env['YARN_REGISTRY'];
  delete process.env['NPM_CONFIG__AUTH'];
  delete process.env['NPM_CONFIG_ALWAYS_AUTH'];

  await expectFileNotToExist('public/manifest.webmanifest');

  // Set the registry via YARN_REGISTRY environment variable
  const registryUrl = getGlobalVariable('package-secure-registry') as string;
  process.env['YARN_REGISTRY'] = registryUrl;

  // Read the original user config to restore later
  const tempRoot = getGlobalVariable('tmp-root') as string;
  const userNpmrcPath = join(tempRoot, '.npmrc');
  const originalUserNpmrc = await readFile(userNpmrcPath, 'utf8');

  // Write the scoped auth credentials to the user config .npmrc
  const registryHost = registryUrl.replace(/^\w+:/, '');
  await writeFile(
    userNpmrcPath,
    originalUserNpmrc +
      `\n${registryHost}/:_auth="${VALID_TOKEN}"` +
      `\n${registryHost}/:always-auth=true` +
      `\nalways-auth=true\n`,
  );

  try {
    await ng(...command);
    await expectFileToExist('public/manifest.webmanifest');
  } finally {
    // Clean up and restore
    delete process.env['YARN_REGISTRY'];
    await writeFile(userNpmrcPath, originalUserNpmrc);
  }
}
