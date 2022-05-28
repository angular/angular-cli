import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { getGlobalVariable, setGlobalVariable } from '../utils/env';

/**
 * Configure npm to use a unique sandboxed environment.
 */
export default async function () {
  const tempRoot: string = getGlobalVariable('tmp-root');
  const npmModulesPrefix = join(tempRoot, 'npm-global');
  const npmRegistry: string = getGlobalVariable('package-registry');
  const npmrc = join(tempRoot, '.npmrc');

  // Configure npm to use the sandboxed npm globals and rc file
  // From this point onward all npm transactions use the "global" npm cache
  // isolated within this e2e test invocation.
  process.env.NPM_CONFIG_USERCONFIG = npmrc;
  process.env.NPM_CONFIG_PREFIX = npmModulesPrefix;

  // Configure the registry and prefix used within the test sandbox
  await writeFile(npmrc, `registry=${npmRegistry}\nprefix=${npmModulesPrefix}`);
  await mkdir(npmModulesPrefix);

  console.log(`  Using "${npmModulesPrefix}" as e2e test global npm cache.`);
}
