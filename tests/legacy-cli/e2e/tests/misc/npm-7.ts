import { ng, npm } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

const errorText = 'The Angular CLI currently requires npm version 6.';

export default async function() {
  // Windows CI fails with permission errors when trying to replace npm
  if (process.platform.startsWith('win')) {
    return;
  }

  const currentDirectory = process.cwd();
  try {
    // Install version 7.x
    await npm('install', '--global', 'npm@7');

    // Ensure `ng add` exits and shows npm error
    const { message: stderrAdd } = await expectToFail(() => ng('add'));
    if (!stderrAdd.includes(errorText)) {
      throw new Error('ng add expected to show npm version error.');
    }

    // Ensure `ng update` exits and shows npm error
    const { message: stderrUpdate } = await expectToFail(() => ng('update'));
    if (!stderrUpdate.includes(errorText)) {
      throw new Error('ng update expected to show npm version error.');
    }

    // Ensure `ng new` exits and shows npm error
    // Must be outside the project for `ng new`
    process.chdir('..');
    const { message: stderrNew } = await expectToFail(() => ng('new'));
    if (!stderrNew.includes(errorText)) {
      throw new Error('ng new expected to show npm version error.');
    }
  } finally {
    // Change directory back
    process.chdir(currentDirectory);

    // Reset version back to 6.x
    await npm('install', '--global', 'npm@6');
  }

}
