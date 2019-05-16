import { deleteFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function() {
  const { stdout: commandOutput } = await ng('version');
  const { stdout: optionOutput } = await ng('--version');
  if (!optionOutput.includes('Angular CLI:')) {
    throw new Error('version not displayed');
  }
  if (commandOutput !== optionOutput) {
    throw new Error('version variants have differing output');
  }

  // doesn't fail on a project with missing angular.json
  await deleteFile('angular.json');
  await ng('version');

  // Doesn't fail outside a project.
  await process.chdir('/');
  await ng('version');
}
