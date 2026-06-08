import { deleteFile } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  const { stdout: commandOutput } = await ng('version');

  if (commandOutput.includes(process.versions.node + ' (Unsupported)')) {
    throw new Error('Node version should not show unsupported entry');
  }

  if (commandOutput.includes('Warning: The current version of Node ')) {
    throw new Error('Node support warning should not be shown');
  }

  // doesn't fail on a project with missing angular.json
  await deleteFile('angular.json');
  await ng('version');

  // Doesn't fail outside a project.
  process.chdir('/');
  await ng('version');
}
