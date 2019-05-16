import { execAndWaitForOutputToMatch, execWithEnv, killAllProcesses } from '../../utils/process';


export default async function() {
  try {
    await execAndWaitForOutputToMatch('ng', ['build', '--watch'], /./);

    const output = await execWithEnv('ps', ['x'], { COLUMNS: '200' });

    if (!output.stdout.match(/ng build --watch/)) {
      throw new Error('Title of the process was not properly set.');
    }
  } finally {
    await killAllProcesses();
  }
}
