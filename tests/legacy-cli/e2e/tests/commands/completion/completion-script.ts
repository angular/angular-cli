import { exec, execAndWaitForOutputToMatch } from '../../../utils/process';

export default async function () {
  // ng build
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'b', ''],
    /test-project/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'build', ''],
    /test-project/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'build', '--a'],
    /--aot/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'build', '--configuration'],
    /production/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'b', '--configuration'],
    /production/,
  );

  // ng run
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'run', ''],
    /test-project\\:build\\:development/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'run', ''],
    /test-project\\:build/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'run', ''],
    /test-project\\:test/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'run', 'test-project:build'],
    /test-project\\:build\\:development/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'ng', 'run', 'test-project:'],
    /test-project\\:test/,
  );

  const { stdout: noServeStdout } = await exec(
    'ng',
    '--get-yargs-completions',
    'ng',
    'run',
    'test-project:build',
  );
  if (noServeStdout.includes(':serve')) {
    throw new Error(
      `':serve' should not have been listed as a completion option.\nSTDOUT:\n${noServeStdout}`,
    );
  }
}
