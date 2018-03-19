import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const modulePath = join('projects', 'test-project', 'src', 'app.module.ts');

  return ng('generate', 'service', 'test-service', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(modulePath,
      /import { TestServiceService } from '.\/test-service.service'/))

    .then(() => process.chdir(join('projects', 'test-project', 'src')))
    .then(() => ng('generate', 'service', 'test-service2', '--module', 'app.module.ts'))
    .then(() => process.chdir('../../..'))
    .then(() => expectFileToMatch(modulePath,
      /import { TestService2Service } from '.\/test-service2.service'/))

    // Try to run the unit tests.
    .then(() => ng('build'));
}
