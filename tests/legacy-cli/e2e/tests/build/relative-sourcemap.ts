import * as fs from 'fs';

import { isAbsolute } from 'path';
import { ng } from '../../utils/process';

export default async function () {
  // General secondary application project
  await ng('generate', 'application', 'secondary-project', '--skip-install');
  await ng('build', 'secondary-project', '--configuration=development');


  await ng('build', '--output-hashing=none', '--source-map', '--configuration=development');
  const content = fs.readFileSync('./dist/secondary-project/main.js.map', 'utf8');
  const {sources} = JSON.parse(content);
  for (const source of sources) {
      if (isAbsolute(source)) {
        throw new Error(`Expected ${source} to be relative.`);
      }
  }
}
