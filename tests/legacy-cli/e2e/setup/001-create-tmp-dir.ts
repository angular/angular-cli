import { dirname } from 'path';
import { getGlobalVariable, setGlobalVariable } from '../utils/env';
import { mktempd } from '../utils/utils';

export default async function () {
  const argv = getGlobalVariable('argv');

  // Get to a temporary directory.
  let tempRoot: string;
  if (argv.reuse) {
    tempRoot = dirname(argv.reuse);
  } else if (argv.tmpdir) {
    tempRoot = argv.tmpdir;
  } else {
    tempRoot = await mktempd('angular-cli-e2e-');
  }
  console.log(`  Using "${tempRoot}" as temporary directory for a new project.`);
  setGlobalVariable('tmp-root', tempRoot);
}
