import * as os from 'os';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  const interfaces = Object.values(os.networkInterfaces()).flat() as os.NetworkInterfaceInfo[];
  let host = '';
  for (const { family, address, internal } of interfaces) {
    if (family === 'IPv4' && !internal) {
      host = address;
      break;
    }
  }

  await updateJsonFile('angular.json', (workspaceJson) => {
    const appArchitect = workspaceJson.projects['test-project'].architect;
    appArchitect.serve.options = appArchitect.serve.options || {};
    appArchitect.serve.options.port = 8888;
    appArchitect.serve.options.host = host;
  });

  await ng('e2e');
  await ng('e2e', '--host', host);
}
