import {existsSync} from 'fs';
import {join} from 'path';

import {isMobileTest, ng} from './utils';


const temp = require('temp');


export default function() {
  // Get to a temporary directory.
  const tempRoot = temp.mkdirSync('angular-cli-e2e');
  console.log(`  Using "${tempRoot}" as temporary directory for a new project.`);
  process.chdir(tempRoot);

  // Setup a new project.
  return ng('new', 'test-project', '--link-cli', isMobileTest() ? '--mobile' : '')
    .then(() => {
      if (!existsSync(join(process.cwd(), 'test-project'))) {
        throw new Error('Project was not created properly.');
      }
    });
}
