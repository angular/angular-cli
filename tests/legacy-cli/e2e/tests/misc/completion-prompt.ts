import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { env } from 'process';
import { execWithEnv } from '../../utils/process';

const AUTOCOMPLETION_PROMPT = /Would you like to enable autocompletion\?/;
const DEFAULT_ENV = Object.freeze({
  ...env,
  // Shell should be mocked for each test that cares about it.
  SHELL: '/bin/bash',
  // Even if the actual test process is run on CI, we're testing user flows which aren't on CI.
  CI: undefined,
  // Tests run on CI technically don't have a TTY, but the autocompletion prompt requires it, so we
  // force a TTY by default.
  NG_FORCE_TTY: '1',
  // Analytics wants to prompt for a first command as well, but we don't care about that here.
  NG_CLI_ANALYTICS: 'false',
});

export default async function () {
  // Sets up autocompletion after user accepts a prompt from any command.
  await mockHome(async (home) => {
    const bashrc = path.join(home, '.bashrc');
    await fs.writeFile(bashrc, `# Other content...`);

    const { stdout } = await execWithEnv(
      'ng',
      ['version'],
      {
        ...DEFAULT_ENV,
        SHELL: '/bin/bash',
        HOME: home,
      },
      'y' /* stdin: accept prompt */,
    );

    if (!AUTOCOMPLETION_PROMPT.test(stdout)) {
      throw new Error('CLI execution did not prompt for autocompletion setup when it should have.');
    }

    const bashrcContents = await fs.readFile(bashrc, 'utf-8');
    if (!bashrcContents.includes('source <(ng completion script)')) {
      throw new Error(
        'Autocompletion was *not* added to `~/.bashrc` after accepting the setup' + ' prompt.',
      );
    }

    if (!stdout.includes('Appended `source <(ng completion script)`')) {
      throw new Error('CLI did not print that it successfully set up autocompletion.');
    }
  });

  // Does nothing if the user rejects the autocompletion prompt.
  await mockHome(async (home) => {
    const bashrc = path.join(home, '.bashrc');
    await fs.writeFile(bashrc, `# Other content...`);

    const { stdout } = await execWithEnv(
      'ng',
      ['version'],
      {
        ...DEFAULT_ENV,
        SHELL: '/bin/bash',
        HOME: home,
      },
      'n' /* stdin: reject prompt */,
    );

    if (!AUTOCOMPLETION_PROMPT.test(stdout)) {
      throw new Error('CLI execution did not prompt for autocompletion setup when it should have.');
    }

    const bashrcContents = await fs.readFile(bashrc, 'utf-8');
    if (bashrcContents.includes('ng completion')) {
      throw new Error(
        'Autocompletion was incorrectly added to `~/.bashrc` after refusing the setup' + ' prompt.',
      );
    }

    if (stdout.includes('Appended `source <(ng completion script)`')) {
      throw new Error(
        'CLI printed that it successfully set up autocompletion when it actually' + " didn't.",
      );
    }
  });

  // Does *not* prompt user for CI executions.
  {
    const { stdout } = await execWithEnv('ng', ['version'], {
      ...DEFAULT_ENV,
      CI: 'true',
      NG_FORCE_TTY: undefined,
    });

    if (AUTOCOMPLETION_PROMPT.test(stdout)) {
      throw new Error('CI execution prompted for autocompletion setup but should not have.');
    }
  }

  // Does *not* prompt user for non-TTY executions.
  {
    const { stdout } = await execWithEnv('ng', ['version'], {
      ...DEFAULT_ENV,
      NG_FORCE_TTY: 'false',
    });

    if (AUTOCOMPLETION_PROMPT.test(stdout)) {
      throw new Error('Non-TTY execution prompted for autocompletion setup but should not have.');
    }
  }

  // Does *not* prompt user for executions without a `$HOME`.
  {
    const { stdout } = await execWithEnv('ng', ['version'], {
      ...DEFAULT_ENV,
      HOME: undefined,
    });

    if (AUTOCOMPLETION_PROMPT.test(stdout)) {
      throw new Error(
        'Execution without a `$HOME` value prompted for autocompletion setup but' +
          ' should not have.',
      );
    }
  }

  // Does *not* prompt user for executions without a `$SHELL`.
  {
    const { stdout } = await execWithEnv('ng', ['version'], {
      ...DEFAULT_ENV,
      SHELL: undefined,
    });

    if (AUTOCOMPLETION_PROMPT.test(stdout)) {
      throw new Error(
        'Execution without a `$SHELL` value prompted for autocompletion setup but' +
          ' should not have.',
      );
    }
  }

  // Does *not* prompt user for executions from unknown shells.
  {
    const { stdout } = await execWithEnv('ng', ['version'], {
      ...DEFAULT_ENV,
      SHELL: '/usr/bin/unknown',
    });

    if (AUTOCOMPLETION_PROMPT.test(stdout)) {
      throw new Error(
        'Execution with an unknown `$SHELL` value prompted for autocompletion setup' +
          ' but should not have.',
      );
    }
  }

  // Does *not* prompt user when an RC file already uses `ng completion`.
  await mockHome(async (home) => {
    await fs.writeFile(
      path.join(home, '.bashrc'),
      `
# Some stuff...

source <(ng completion script)

# Some other stuff...
    `.trim(),
    );

    const { stdout } = await execWithEnv('ng', ['version'], {
      ...DEFAULT_ENV,
      SHELL: '/bin/bash',
      HOME: home,
    });

    if (AUTOCOMPLETION_PROMPT.test(stdout)) {
      throw new Error(
        "Execution with an existing `ng completion` line in the user's RC file" +
          ' prompted for autocompletion setup but should not have.',
      );
    }
  });
}

async function mockHome(cb: (home: string) => Promise<void>): Promise<void> {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'angular-cli-e2e-home-'));

  try {
    await cb(tempHome);
  } finally {
    await fs.rm(tempHome, { recursive: true, force: true });
  }
}
