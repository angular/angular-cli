import { join } from 'path';
import { cmp } from 'semver';
import { getGlobalVariable } from '../utils/env';
import { git } from '../utils/process';

export default async function () {
  const tempRoot: string = getGlobalVariable('tmp-root');

  const cwd = process.cwd();
  try {
    // chdir() to ensure no local git config
    process.chdir(tempRoot);

    // Use a custom 'global' and 'system' config for this e2e test environment
    // Requires: git >=2.32.0
    // See https://github.com/git/git/blob/v2.32.0/Documentation/RelNotes/2.32.0.txt#L88-L93
    const gitVersion = (await git('--version')).stdout.replace(/.*?(\d+\.\d+\.\d+).*/, '$1');
    if (!cmp(gitVersion, '>=', '2.32.0')) {
      throw new Error('legacy-cli tests require git >= 2.32.0');
    }

    // A custom global config
    process.env.GIT_CONFIG_GLOBAL = join(tempRoot, '.gitconfig');

    // A dummy system config to disable it
    process.env.GIT_CONFIG_SYSTEM = join(tempRoot, '.gitconfig-system');

    // Legacy method of disabling system (git <2.32.0)
    process.env.GIT_CONFIG_NOSYSTEM = '1';

    // Commit author info
    process.env.GIT_AUTHOR_NAME = 'Angular CLI E2e';
    process.env.GIT_AUTHOR_EMAIL = 'angular-core+e2e@google.com';

    await git('config', '--list', '--show-origin');
  } finally {
    process.chdir(cwd);
  }
}
