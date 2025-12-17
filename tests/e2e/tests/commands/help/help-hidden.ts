import assert from 'node:assert/strict';
import { silentNg } from '../../../utils/process';

export default async function () {
  const { stdout: stdoutNew } = await silentNg('--help');
  assert.doesNotMatch(
    stdoutNew,
    /(easter-egg)|(ng make-this-awesome)|(ng init)/,
    'Expected to not match "(easter-egg)|(ng make-this-awesome)|(ng init)" in help output.',
  );

  const { stdout: ngGenerate } = await silentNg('--help', 'generate', 'component');
  assert.doesNotMatch(ngGenerate, /--path/, 'Expected to not match "--path" in help output.');
}
