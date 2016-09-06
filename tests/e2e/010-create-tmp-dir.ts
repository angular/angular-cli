import {join} from 'path';

import {isMobileTest, ng, expectFileToExist} from './utils';
import {oneLine} from 'common-tags';


const temp = require('temp');


export default function() {
  // Get to a temporary directory.
  let tempRoot = temp.mkdirSync('angular-cli-e2e');
  console.log(`  Using "${tempRoot}" as temporary directory for a new project.`);
  process.chdir(tempRoot);
}
