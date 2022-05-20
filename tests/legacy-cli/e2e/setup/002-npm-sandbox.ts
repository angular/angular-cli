import { mkdir, writeFile } from 'fs/promises';
import { delimiter, join } from 'path';
import { getGlobalVariable } from '../utils/env';

/**
 * Configure npm to use a unique sandboxed environment.
 */
export default async function () {
  const tempRoot: string = getGlobalVariable('tmp-root');
  const npmModulesPrefix = join(tempRoot, 'npm-global');
  const npmrc = join(tempRoot, '.npmrc');

  // Configure npm to use the sandboxed npm globals and rc file
  process.env.NPM_CONFIG_USERCONFIG = npmrc;
  process.env.NPM_CONFIG_PREFIX = npmModulesPrefix;

  // Ensure the custom npm global bin is first on the PATH
  // https://docs.npmjs.com/cli/v8/configuring-npm/folders#executables
  if (process.platform.startsWith('win')) {
    process.env.PATH = npmModulesPrefix + delimiter + process.env.PATH;
  } else {
    process.env.PATH = join(npmModulesPrefix, 'bin') + delimiter + process.env.PATH;
  }

  // Ensure the globals directory and npmrc file exist.
  // Configure the registry in the npmrc in addition to the environment variable.
  await writeFile(npmrc, 'registry=' + getGlobalVariable('package-registry'));
  await mkdir(npmModulesPrefix);

  console.log(`  Using "${npmModulesPrefix}" as e2e test global npm cache.`);
}
