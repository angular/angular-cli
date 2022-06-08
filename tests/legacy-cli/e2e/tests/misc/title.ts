import { execAndWaitForOutputToMatch, execWithEnv } from '../../utils/process';

export default async function () {
  if (process.platform.startsWith('win')) {
    // "On Windows, process.title affects the console title, but not the name of the process in the task manager."
    // https://stackoverflow.com/questions/44756196/how-to-change-the-node-js-process-name-on-windows-10#comment96259375_44756196
    return;
  }

  await execAndWaitForOutputToMatch('ng', ['build', '--configuration=development', '--watch'], /./);

  const output = await execWithEnv('ps', ['x'], { COLUMNS: '200' });

  if (!output.stdout.match(/ng build --configuration=development --watch/)) {
    throw new Error('Title of the process was not properly set.');
  }
}
