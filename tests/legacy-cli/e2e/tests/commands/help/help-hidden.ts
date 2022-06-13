import { silentNg } from '../../../utils/process';

export default async function () {
  const { stdout: stdoutNew } = await silentNg('--help');
  if (/(easter-egg)|(ng make-this-awesome)|(ng init)/.test(stdoutNew)) {
    throw new Error(
      'Expected to not match "(easter-egg)|(ng make-this-awesome)|(ng init)" in help output.',
    );
  }

  const { stdout: ngGenerate } = await silentNg('--help', 'generate', 'component');
  if (ngGenerate.includes('--path')) {
    throw new Error('Expected to not match "--path" in help output.');
  }
}
