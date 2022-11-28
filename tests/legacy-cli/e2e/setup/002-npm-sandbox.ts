import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { getGlobalVariable, setGlobalVariable } from '../utils/env';

/**
 * Configure npm to use a unique sandboxed environment.
 */
export default async function () {
  const tempRoot: string = getGlobalVariable('tmp-root');
  const npmModulesPrefix = join(tempRoot, 'npm-global');
  const yarnModulesPrefix = join(tempRoot, 'yarn-global');
  const npmRegistry: string = getGlobalVariable('package-registry');
  const npmrc = join(tempRoot, '.npmrc');
  const yarnrc = join(tempRoot, '.yarnrc');

  // Change the npm+yarn userconfig to the sandboxed npmrc to override the default ~
  process.env.NPM_CONFIG_USERCONFIG = npmrc;

  // The npm+yarn registry URL
  process.env.NPM_CONFIG_REGISTRY = npmRegistry;

  // Configure npm+yarn to use a sandboxed bin directory
  // From this point onward all yarn/npm bin files/symlinks are put into the prefix directories
  process.env.NPM_CONFIG_PREFIX = npmModulesPrefix;
  process.env.YARN_CONFIG_PREFIX = yarnModulesPrefix;

  // Snapshot builds may contain versions that are not yet released (e.g., RC phase main branch).
  // In this case peer dependency ranges may not resolve causing npm 7+ to fail during tests.
  // To support this case, legacy peer dependency mode is enabled for snapshot builds.
  if (getGlobalVariable('argv')['ng-snapshots']) {
    process.env['NPM_CONFIG_legacy_peer_deps'] = 'true';
  }

  // Configure the registry and prefix used within the test sandbox via rc files
  await writeFile(npmrc, `registry=${npmRegistry}\nprefix=${npmModulesPrefix}`);
  await writeFile(yarnrc, `registry ${npmRegistry}\nprefix ${yarnModulesPrefix}`);

  await mkdir(npmModulesPrefix);
  await mkdir(yarnModulesPrefix);

  setGlobalVariable('npm-global', npmModulesPrefix);
  setGlobalVariable('yarn-global', yarnModulesPrefix);

  // Disable all update/notification related npm/yarn features such as the NPM updater notifier.
  // The NPM updater notifier may prevent the child process from closing until it timeouts after 3 minutes.
  process.env.NO_UPDATE_NOTIFIER = '1';
  process.env.NPM_CONFIG_UPDATE_NOTIFIER = 'false';

  console.log(`  Using "${npmModulesPrefix}" as e2e test global npm bin dir.`);
  console.log(`  Using "${yarnModulesPrefix}" as e2e test global yarn bin dir.`);
}
