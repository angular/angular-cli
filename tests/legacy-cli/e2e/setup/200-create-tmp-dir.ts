import {dirname} from 'path';
import {setGlobalVariable, getGlobalVariable} from '../utils/env';


const temp = require('temp');

export default function() {
  const argv = getGlobalVariable('argv');

  // Get to a temporary directory.
  let tempRoot = argv.tmpdir || temp.mkdirSync('angular-cli-e2e-');
  if (argv.reuse) {
    tempRoot = dirname(argv.reuse);
  }
  console.log(`  Using "${tempRoot}" as temporary directory for a new project.`);
  setGlobalVariable('tmp-root', tempRoot);
  process.chdir(tempRoot);
}
