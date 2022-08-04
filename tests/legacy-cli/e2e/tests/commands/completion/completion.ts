import { promises as fs } from 'fs';
import * as path from 'path';
import { getGlobalVariable } from '../../../utils/env';
import { mockHome } from '../../../utils/utils';
import {
  execAndCaptureError,
  execAndWaitForOutputToMatch,
  execWithEnv,
  silentNpm,
} from '../../../utils/process';

const testRegistry = getGlobalVariable('package-registry');

export default async function () {
  // Windows Cmd and Powershell do not support autocompletion. Run a different set of tests to
  // confirm autocompletion fails gracefully.
  if (process.platform === 'win32') {
    await windowsTests();

    return;
  }

  // Generates new `.bashrc` file.
  await mockHome(async (home) => {
    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/bin/bash',
      },
    );

    const rcContents = await fs.readFile(path.join(home, '.bashrc'), 'utf-8');
    const expected = `
# Load Angular CLI autocompletion.
source <(ng completion script)
    `.trim();
    if (!rcContents.includes(expected)) {
      throw new Error(`~/.bashrc does not contain autocompletion script. Contents:\n${rcContents}`);
    }
  });

  // Generates new `.zshrc` file.
  await mockHome(async (home) => {
    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/usr/bin/zsh',
      },
    );

    const rcContents = await fs.readFile(path.join(home, '.zshrc'), 'utf-8');
    const expected = `
# Load Angular CLI autocompletion.
source <(ng completion script)
    `.trim();
    if (!rcContents.includes(expected)) {
      throw new Error(`~/.zshrc does not contain autocompletion script. Contents:\n${rcContents}`);
    }
  });

  // Appends to existing `.bashrc` file.
  await mockHome(async (home) => {
    const bashrc = path.join(home, '.bashrc');
    await fs.writeFile(bashrc, '# Other commands...');
    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/bin/bash',
      },
    );

    const rcContents = await fs.readFile(bashrc, 'utf-8');
    const expected = `# Other commands...

# Load Angular CLI autocompletion.
source <(ng completion script)
`;
    if (rcContents !== expected) {
      throw new Error(`~/.bashrc does not match expectation. Contents:\n${rcContents}`);
    }
  });

  // Appends to existing `.bash_profile` file.
  await mockHome(async (home) => {
    const bashProfile = path.join(home, '.bash_profile');
    await fs.writeFile(bashProfile, '# Other commands...');
    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/bin/bash',
      },
    );

    const rcContents = await fs.readFile(bashProfile, 'utf-8');
    const expected = `# Other commands...

# Load Angular CLI autocompletion.
source <(ng completion script)
`;
    if (rcContents !== expected) {
      throw new Error(`~/.bash_profile does not match expectation. Contents:\n${rcContents}`);
    }
  });

  // Appends to existing `.profile` file (using Bash).
  await mockHome(async (home) => {
    const profile = path.join(home, '.profile');
    await fs.writeFile(profile, '# Other commands...');
    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/bin/bash',
      },
    );

    const rcContents = await fs.readFile(profile, 'utf-8');
    const expected = `# Other commands...

# Load Angular CLI autocompletion.
source <(ng completion script)
`;
    if (rcContents !== expected) {
      throw new Error(`~/.profile does not match expectation. Contents:\n${rcContents}`);
    }
  });

  // Bash shell prefers `.bashrc`.
  await mockHome(async (home) => {
    const bashrc = path.join(home, '.bashrc');
    await fs.writeFile(bashrc, '# `.bashrc` commands...');
    const bashProfile = path.join(home, '.bash_profile');
    await fs.writeFile(bashProfile, '# `.bash_profile` commands...');
    const profile = path.join(home, '.profile');
    await fs.writeFile(profile, '# `.profile` commands...');

    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/bin/bash',
      },
    );

    const bashrcContents = await fs.readFile(bashrc, 'utf-8');
    const bashrcExpected = `# \`.bashrc\` commands...

# Load Angular CLI autocompletion.
source <(ng completion script)
`;
    if (bashrcContents !== bashrcExpected) {
      throw new Error(`~/.bashrc does not match expectation. Contents:\n${bashrcContents}`);
    }
    const bashProfileContents = await fs.readFile(bashProfile, 'utf-8');
    if (bashProfileContents !== '# `.bash_profile` commands...') {
      throw new Error(
        `~/.bash_profile does not match expectation. Contents:\n${bashProfileContents}`,
      );
    }
    const profileContents = await fs.readFile(profile, 'utf-8');
    if (profileContents !== '# `.profile` commands...') {
      throw new Error(`~/.profile does not match expectation. Contents:\n${profileContents}`);
    }
  });

  // Appends to existing `.zshrc` file.
  await mockHome(async (home) => {
    const zshrc = path.join(home, '.zshrc');
    await fs.writeFile(zshrc, '# Other commands...');
    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/usr/bin/zsh',
      },
    );

    const rcContents = await fs.readFile(zshrc, 'utf-8');
    const expected = `# Other commands...

# Load Angular CLI autocompletion.
source <(ng completion script)
`;
    if (rcContents !== expected) {
      throw new Error(`~/.zshrc does not match expectation. Contents:\n${rcContents}`);
    }
  });

  // Appends to existing `.zsh_profile` file.
  await mockHome(async (home) => {
    const zshProfile = path.join(home, '.zsh_profile');
    await fs.writeFile(zshProfile, '# Other commands...');
    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/usr/bin/zsh',
      },
    );

    const rcContents = await fs.readFile(zshProfile, 'utf-8');
    const expected = `# Other commands...

# Load Angular CLI autocompletion.
source <(ng completion script)
`;
    if (rcContents !== expected) {
      throw new Error(`~/.zsh_profile does not match expectation. Contents:\n${rcContents}`);
    }
  });

  // Appends to existing `.profile` file (using Zsh).
  await mockHome(async (home) => {
    const profile = path.join(home, '.profile');
    await fs.writeFile(profile, '# Other commands...');
    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/usr/bin/zsh',
      },
    );

    const rcContents = await fs.readFile(profile, 'utf-8');
    const expected = `# Other commands...

# Load Angular CLI autocompletion.
source <(ng completion script)
`;
    if (rcContents !== expected) {
      throw new Error(`~/.profile does not match expectation. Contents:\n${rcContents}`);
    }
  });

  // Zsh prefers `.zshrc`.
  await mockHome(async (home) => {
    const zshrc = path.join(home, '.zshrc');
    await fs.writeFile(zshrc, '# `.zshrc` commands...');
    const zshProfile = path.join(home, '.zsh_profile');
    await fs.writeFile(zshProfile, '# `.zsh_profile` commands...');
    const profile = path.join(home, '.profile');
    await fs.writeFile(profile, '# `.profile` commands...');

    await execAndWaitForOutputToMatch(
      'ng',
      ['completion'],
      /Appended `source <\(ng completion script\)`/,
      {
        ...process.env,
        'SHELL': '/usr/bin/zsh',
      },
    );

    const zshrcContents = await fs.readFile(zshrc, 'utf-8');
    const zshrcExpected = `# \`.zshrc\` commands...

# Load Angular CLI autocompletion.
source <(ng completion script)
`;
    if (zshrcContents !== zshrcExpected) {
      throw new Error(`~/.zshrc does not match expectation. Contents:\n${zshrcContents}`);
    }

    const zshProfileContents = await fs.readFile(zshProfile, 'utf-8');
    if (zshProfileContents !== '# `.zsh_profile` commands...') {
      throw new Error(
        `~/.zsh_profile does not match expectation. Contents:\n${zshProfileContents}`,
      );
    }
    const profileContents = await fs.readFile(profile, 'utf-8');
    if (profileContents !== '# `.profile` commands...') {
      throw new Error(`~/.profile does not match expectation. Contents:\n${profileContents}`);
    }
  });

  // Fails for no `$HOME` directory.
  {
    const err = await execAndCaptureError('ng', ['completion'], {
      ...process.env,
      SHELL: '/bin/bash',
      HOME: undefined,
    });
    if (!err.message.includes('`$HOME` environment variable not set.')) {
      throw new Error(`Expected unset \`$HOME\` error message, but got:\n\n${err.message}`);
    }
  }

  // Fails for no `$SHELL`.
  await mockHome(async (home) => {
    const err = await execAndCaptureError('ng', ['completion'], {
      ...process.env,
      SHELL: undefined,
    });
    if (!err.message.includes('`$SHELL` environment variable not set.')) {
      throw new Error(`Expected unset \`$SHELL\` error message, but got:\n\n${err.message}`);
    }
  });

  // Fails for unknown `$SHELL`.
  await mockHome(async (home) => {
    const err = await execAndCaptureError('ng', ['completion'], {
      ...process.env,
      SHELL: '/usr/bin/unknown',
    });
    if (!err.message.includes('Unknown `$SHELL` environment variable')) {
      throw new Error(`Expected unknown \`$SHELL\` error message, but got:\n\n${err.message}`);
    }
  });

  // Does *not* warn when a global CLI install is present on the system.
  await mockHome(async (home) => {
    const { stdout } = await execWithEnv('ng', ['completion'], {
      ...process.env,
      'SHELL': '/usr/bin/zsh',
    });

    if (stdout.includes('there does not seem to be a global install of the Angular CLI')) {
      throw new Error(`CLI warned about missing global install, but one should exist.`);
    }
  });

  // Warns when a global CLI install is *not* present on the system.
  await mockHome(async (home) => {
    try {
      // Temporarily uninstall the global CLI binary from the system.
      await silentNpm(['uninstall', '--global', '@angular/cli', `--registry=${testRegistry}`]);

      // Setup a fake project directory with a local install of the CLI.
      const projectDir = path.join(home, 'project');
      await fs.mkdir(projectDir);
      await silentNpm(['init', '-y', `--registry=${testRegistry}`], { cwd: projectDir });
      await silentNpm(['install', '@angular/cli', `--registry=${testRegistry}`], {
        cwd: projectDir,
      });

      // Invoke the local CLI binary.
      const localCliBinary = path.join(projectDir, 'node_modules', '.bin', 'ng');
      const { stdout } = await execWithEnv(localCliBinary, ['completion'], {
        ...process.env,
        'SHELL': '/usr/bin/zsh',
      });

      if (stdout.includes('there does not seem to be a global install of the Angular CLI')) {
        throw new Error(`CLI warned about missing global install, but one should exist.`);
      }
    } finally {
      // Reinstall global CLI for remainder of the tests.
      await silentNpm(['install', '--global', '@angular/cli', `--registry=${testRegistry}`]);
    }
  });
}

async function windowsTests(): Promise<void> {
  // Should fail with a clear error message.
  const err = await execAndCaptureError('ng', ['completion']);
  if (!err.message.includes("Cmd and Powershell don't support command autocompletion")) {
    throw new Error(
      `Expected Windows autocompletion to fail with custom error, but got:\n\n${err.message}`,
    );
  }
}
