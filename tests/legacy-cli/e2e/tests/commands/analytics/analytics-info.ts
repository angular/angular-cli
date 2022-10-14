import { execAndWaitForOutputToMatch } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  // Should be disabled by default.
  await configureTest(undefined /** analytics */);
  await execAndWaitForOutputToMatch('ng', ['analytics', 'info'], /Effective status: disabled/, {
    NG_FORCE_TTY: '0', // Disable prompts
  });

  await configureTest('1dba0835-38a3-4957-bf34-9974e2df0df3' /** analytics */);
  await execAndWaitForOutputToMatch('ng', ['analytics', 'info'], /Effective status: enabled/, {
    NG_FORCE_TTY: '0', // Disable prompts
  });

  await configureTest(false /** analytics */);
  await execAndWaitForOutputToMatch('ng', ['analytics', 'info'], /Effective status: disabled/, {
    NG_FORCE_TTY: '0', // Disable prompts
  });
}

async function configureTest(analytics: false | string | undefined): Promise<void> {
  await updateJsonFile('angular.json', (config) => {
    config.cli ??= {};
    config.cli.analytics = analytics;
  });
}
