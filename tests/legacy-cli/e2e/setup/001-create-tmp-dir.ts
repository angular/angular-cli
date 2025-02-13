import { dirname } from 'node:path';
import { getGlobalVariable, setGlobalVariable } from '../utils/env';
import { mktempd } from '../utils/utils';
import { windowsTmpDir } from '../utils/wsl';

export default async function () {
  const argv = getGlobalVariable('argv');
  let defaultTmpDir = process.env.E2E_TEMP;

  // In Windows mode, we need a temporary directory outside WSL.
  // This is because npm would otherwise try to install e.g. global CLI inside
  // the WSL mounted directory, but npm fails recursively due to some bug.
  // See: https://github.com/npm/cli/issues/7309.
  defaultTmpDir ??= windowsTmpDir;

  // Get to a temporary directory.
  let tempRoot: string;
  if (argv.reuse) {
    tempRoot = dirname(argv.reuse);
  } else if (argv.tmpdir) {
    tempRoot = argv.tmpdir;
  } else {
    tempRoot = await mktempd('angular-cli-e2e-', defaultTmpDir);
  }
  console.log(`  Using "${tempRoot}" as temporary directory for a new project.`);
  setGlobalVariable('tmp-root', tempRoot);
}
