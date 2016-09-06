import {join} from 'path';

import {isMobileTest, ng, expectFileToExist} from './utils';
import {oneLine} from 'common-tags';


const temp = require('temp');


export default function() {
  // Get to a temporary directory.
  let tempRoot = temp.mkdirSync('angular-cli-e2e');
  console.log(`  Using "${tempRoot}" as temporary directory for a new project.`);
  process.chdir(tempRoot);
  // Update tempRoot in case of symlinks
  tempRoot = process.cwd();

  // Setup a new project.
  return ng('new', 'test-project', '--link-cli', isMobileTest() ? '--mobile' : undefined)
    .then(() => expectFileToExist(join(process.cwd(), 'test-project')))
    .then(() => {
      process.chdir('./test-project');

      if (process.cwd() != join(tempRoot, 'test-project')) {
        throw new Error(oneLine`
          Path isn't properly set. Expected "${join(tempRoot, 'test-project')}", got
          "${process.cwd()}".
        `);
      }
    });
}
