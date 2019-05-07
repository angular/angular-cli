import { killAllProcesses, ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  try {
    await updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.serve.options.servePath = 'test/';
    });

    await ng('e2e');
  } finally {
    await killAllProcesses();
  }
}
