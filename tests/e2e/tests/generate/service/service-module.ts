import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


// tslint:disable:max-line-length
export default function() {
  const servicePath = join('projects', 'test-project', 'src', 'app', 'test-service.service.ts');
  const service2Path = join('projects', 'test-project', 'src', 'app', 'test-service2.service.ts');

  return ng('generate', 'service', 'test-service', '--module', 'app.module.ts')
    .then(() => expectFileToMatch(servicePath, /import { AppModule } from '.\/app.module'/))
    .then(() => expectFileToMatch(servicePath, /providedIn: AppModule,/))

    .then(() => process.chdir(join('projects', 'test-project', 'src', 'app')))
    .then(() => ng('generate', 'service', 'test-service2', '--module', 'app.module.ts'))
    .then(() => process.chdir('../../../..'))
    .then(() => expectFileToMatch(service2Path, /import { AppModule } from '.\/app.module'/))
    .then(() => expectFileToMatch(service2Path, /providedIn: AppModule,/));

    // Try to run the unit tests.
    // TODO: re-enable when updated to Angular v6
    // .then(() => ng('build'));
}
