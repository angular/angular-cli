import { promises as fs } from 'fs';
import { execWithEnv } from '../../utils/process';

const ANALYTICS_PROMPT = /Would you like to share anonymous usage data/;

export default async function () {
  // CLI should prompt for analytics permissions.
  await mockHome(async (home) => {
    const { stdout } = await execWithEnv(
      'ng',
      ['version'],
      {
        ...process.env,
        HOME: home,
        NG_FORCE_TTY: '1',
        NG_FORCE_AUTOCOMPLETE: 'false',
      },
      'y' /* stdin */,
    );

    if (!ANALYTICS_PROMPT.test(stdout)) {
      throw new Error('CLI did not prompt for analytics permission.');
    }
  });

  // CLI should skip analytics prompt with `NG_CLI_ANALYTICS=false`.
  await mockHome(async (home) => {
    const { stdout } = await execWithEnv('ng', ['version'], {
      ...process.env,
      HOME: home,
      NG_FORCE_TTY: '1',
      NG_CLI_ANALYTICS: 'false',
      NG_FORCE_AUTOCOMPLETE: 'false',
    });

    if (ANALYTICS_PROMPT.test(stdout)) {
      throw new Error('CLI prompted for analytics permission when it should be forced off.');
    }
  });

  // CLI should skip analytics prompt during `ng update`.
  await mockHome(async (home) => {
    const { stdout } = await execWithEnv('ng', ['update', '--help'], {
      ...process.env,
      HOME: home,
      NG_FORCE_TTY: '1',
      NG_FORCE_AUTOCOMPLETE: 'false',
    });

    if (ANALYTICS_PROMPT.test(stdout)) {
      throw new Error(
        'CLI prompted for analytics permission during an update where it should not' + ' have.',
      );
    }
  });
}

async function mockHome(cb: (home: string) => Promise<void>): Promise<void> {
  const tempHome = await fs.mkdtemp('angular-cli-e2e-home-');

  try {
    await cb(tempHome);
  } finally {
    await fs.rm(tempHome, { recursive: true, force: true });
  }
}
