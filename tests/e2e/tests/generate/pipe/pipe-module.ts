import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return ng('generate', 'pipe', 'pipe-test', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { PipeTestPipe } from '.\/pipe-test.pipe'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
