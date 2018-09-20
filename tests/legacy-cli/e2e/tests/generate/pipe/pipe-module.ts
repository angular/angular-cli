import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'pipe', 'test-pipe', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestPipePipe } from '.\/test-pipe.pipe'/))

    .then(() => process.chdir(join('src', 'app')))
    .then(() => ng('generate', 'pipe', 'test-pipe2', '--module', 'app.module.ts'))
    .then(() => process.chdir('../..'))
    .then(() => expectFileToMatch(modulePath,
      /import { TestPipe2Pipe } from '.\/test-pipe2.pipe'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
