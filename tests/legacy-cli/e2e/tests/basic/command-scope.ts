import { homedir } from 'os';
import { silentNg } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  const originalCwd = process.cwd();

  try {
    // Run inside workspace
    await silentNg('generate', 'component', 'foo', '--dry-run');

    // The version command can be run in and outside of a workspace.
    await silentNg('version');

    const { message: ngNewFailure } = await expectToFail(() =>
      silentNg('new', 'proj-name', '--dry-run'),
    );
    if (
      !ngNewFailure.includes(
        'This command is not available when running the Angular CLI inside a workspace.',
      )
    ) {
      throw new Error('ng new should have failed when ran inside a workspace.');
    }

    // Chnage CWD to run outside a workspace.
    process.chdir(homedir());

    // ng generate can only be ran inside.
    const { message: ngGenerateFailure } = await expectToFail(() =>
      silentNg('generate', 'component', 'foo', '--dry-run'),
    );
    if (
      !ngGenerateFailure.includes(
        'This command is not available when running the Angular CLI outside a workspace.',
      )
    ) {
      throw new Error('ng generate should have failed when ran outside a workspace.');
    }

    // ng new can only be ran outside of a workspace
    await silentNg('new', 'proj-name', '--dry-run');

    // The version command can be run in and outside of a workspace.
    await silentNg('version');
  } finally {
    process.chdir(originalCwd);
  }
}
