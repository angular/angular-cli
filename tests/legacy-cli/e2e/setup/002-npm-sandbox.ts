import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { getGlobalVariable } from '../utils/env';

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
  process.env.NPM_CONFIG_REGISTRY = npmRegistry;

  // Snapshot builds may contain versions that are not yet released (e.g., RC phase main branch).
  // In this case peer dependency ranges may not resolve causing npm 7+ to fail during tests.
  // To support this case, legacy peer dependency mode is enabled for snapshot builds.
  if (getGlobalVariable('argv')['ng-snapshots']) {
    process.env['NPM_CONFIG_legacy_peer_deps'] = 'true';
  }

  // Configure the registry and prefix used within the test sandbox
  await writeFile(npmrc, `registry=${npmRegistry}\nprefix=${npmModulesPrefix}`);
  await mkdir(npmModulesPrefix);

  console.log(`  Using "${npmModulesPrefix}" as e2e test global npm cache.`);
}
