import * as fs from 'fs-extra';
import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const root = process.cwd();
  const modulePath = join(root, 'src', 'app', 'app.module.ts');

  fs.mkdirSync('./src/app/sub-dir');

  return ng('generate', 'pipe', 'test-pipe', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestPipePipe } from '.\/test-pipe.pipe'/))

    .then(() => process.chdir(join(root, 'src', 'app')))
    .then(() => ng('generate', 'pipe', 'test-pipe2', '--module', 'app.module.ts'))
    .then(() => expectFileToMatch(modulePath,
      /import { TestPipe2Pipe } from '.\/test-pipe2.pipe'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
