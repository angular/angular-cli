import { execAndCaptureError, ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  // Setup `protractor` builder.
  await updateJsonFile('angular.json', (config) => {
    config.projects['test-project'].architect['e2e'] = {
      builder: '@angular-devkit/build-angular:protractor',
      options: {
        protractorConfig: '',
      },
    };
  });

  const error = await execAndCaptureError('ng', ['e2e']);
  if (!error.message.includes('Protractor has reached end-of-life')) {
    throw new Error(`Protractor did not fail with an appropriate message. Got:\n${error.message}`);
  }
}
