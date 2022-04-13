import { execAndWaitForOutputToMatch } from '../../utils/process';

export default async function () {
  // ng build
  await execAndWaitForOutputToMatch('ng', ['--get-yargs-completions', 'b', ''], /test-project/);
  await execAndWaitForOutputToMatch('ng', ['--get-yargs-completions', 'build', ''], /test-project/);
  await execAndWaitForOutputToMatch('ng', ['--get-yargs-completions', 'build', '--a'], /--aot/);
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'build', '--configuration'],
    /production/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'b', '--configuration'],
    /production/,
  );

  // ng run
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'run', ''],
    /test-project\:build\:development/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'run', ''],
    /test-project\:build/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'run', ''],
    /test-project\:test/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'run', 'test-project:build'],
    /test-project\:build\:development/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'run', 'test-project:'],
    /test-project\:test/,
  );
  await execAndWaitForOutputToMatch(
    'ng',
    ['--get-yargs-completions', 'run', 'test-project:build'],
    // does not include 'test-project:serve'
    /^((?!:serve).)*$/,
  );
}
