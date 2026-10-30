import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { deleteFile, expectFileToExist } from '../../../utils/fs';
import { ng, silentNg } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  let ngError: Error;

  ngError = await expectToFail(() => silentNg('config', 'cli.completion.prompted', 'true'));
  assert.match(ngError.message, /Unknown option "completion" at "\/cli"\./);

  ngError = await expectToFail(() =>
    silentNg('config', '--global', 'cli.completion.invalid', 'true'),
  );
  assert.match(ngError.message, /Unknown option "invalid" at "\/cli\/completion"\./);

  ngError = await expectToFail(() => silentNg('config', '--global', 'cli.cache.enabled', 'true'));
  assert.match(ngError.message, /Unknown option "cache" at "\/cli"\./);

  ngError = await expectToFail(() => silentNg('config', 'cli.completion.prompted'));
  assert.match(ngError.message, /Value cannot be found\./);

  const globalConfigPath = join(homedir(), '.angular-config.json');
  try {
    await ng('config', '--global', 'cli.completion.prompted', 'true');
    const { stdout } = await silentNg('config', '--global', 'cli.completion.prompted');
    assert.match(stdout, /true/);

    await expectFileToExist(globalConfigPath);
  } finally {
    await deleteFile(globalConfigPath).catch(() => {});
  }
}
