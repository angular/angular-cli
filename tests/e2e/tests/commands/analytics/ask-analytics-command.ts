import assert from 'node:assert/strict';
import { execWithEnv } from '../../../utils/process';
import { mockHome } from '../../../utils/utils';

const ANALYTICS_PROMPT = /Would you like to share pseudonymous usage data/;

export default async function () {
  // CLI should prompt for analytics permissions.
  await mockHome(async () => {
    const { stdout } = await execWithEnv(
      'ng',
      ['config'],
      {
        ...process.env,
        NG_FORCE_TTY: '1',
        NG_FORCE_AUTOCOMPLETE: 'false',
      },
      'n\n' /* stdin */,
    );

    assert.match(stdout, ANALYTICS_PROMPT, 'CLI did not prompt for analytics permission.');
  });

  // CLI should skip analytics prompt with `NG_CLI_ANALYTICS=false`.
  await mockHome(async () => {
    const { stdout } = await execWithEnv('ng', ['config'], {
      ...process.env,
      NG_FORCE_TTY: '1',
      NG_CLI_ANALYTICS: 'false',
      NG_FORCE_AUTOCOMPLETE: 'false',
    });

    assert.doesNotMatch(
      stdout,
      ANALYTICS_PROMPT,
      'CLI prompted for analytics permission when it should be forced off.',
    );
  });

  // CLI should skip analytics prompt during `ng update`.
  await mockHome(async () => {
    const { stdout } = await execWithEnv('ng', ['update', '--help'], {
      ...process.env,
      NG_FORCE_TTY: '1',
      NG_FORCE_AUTOCOMPLETE: 'false',
    });

    assert.doesNotMatch(
      stdout,
      ANALYTICS_PROMPT,
      'CLI prompted for analytics permission during an update where it should not have.',
    );
  });
}
