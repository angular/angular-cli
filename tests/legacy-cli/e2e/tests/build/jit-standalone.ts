import { ng } from '../../utils/process';
import { updateJsonFile, useCIChrome, useCIDefaults } from '../../utils/project';

export default async function () {
  await ng('generate', 'app', 'test-project-two', '--standalone', '--skip-install');

  // Make prod use JIT.
  await updateJsonFile('angular.json', (configJson) => {
    const appArchitect = configJson.projects['test-project-two'].architect;
    const config = appArchitect.build.configurations;
    config['production'].aot = false;
    config['production'].buildOptimizer = false;
    config['development'].aot = false;
  });

  // Setup testing to use CI Chrome.
  await useCIChrome('test-project-two', './e2e/');
  await useCIDefaults('test-project-two');

  // Test it works
  await ng('e2e', '--configuration=production');
  await ng('e2e', '--configuration=development');
}
