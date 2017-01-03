import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'pipe', 'test-pipe', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestPipePipe } from '.\/test-pipe.pipe'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
