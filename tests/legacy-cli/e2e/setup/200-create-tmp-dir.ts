import { mkdtempSync, realpathSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { getGlobalVariable, setGlobalVariable } from '../utils/env';

export default function() {
  const argv = getGlobalVariable('argv');

  // Get to a temporary directory.
  let tempRoot: string;
  if (argv.reuse) {
    tempRoot = dirname(argv.reuse);
  } else if (argv.tmpdir) {
    tempRoot = argv.tmpdir;
  } else {
    tempRoot = mkdtempSync(join(realpathSync(tmpdir()), 'angular-cli-e2e-'));
  }
  console.log(`  Using "${tempRoot}" as temporary directory for a new project.`);
  setGlobalVariable('tmp-root', tempRoot);
  process.chdir(tempRoot);
}
