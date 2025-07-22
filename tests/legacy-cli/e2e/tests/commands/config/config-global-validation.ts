import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { deleteFile, expectFileToExist } from '../../../utils/fs';
import { ng, silentNg } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  let ngError: Error;

  ngError = await expectToFail(() => silentNg('config', 'cli.completion.prompted', 'true'));
  assert.match(
    ngError.message,
    /Data path "\/cli" must NOT have additional properties\(completion\)\./,
  );

  ngError = await expectToFail(() =>
    silentNg('config', '--global', 'cli.completion.invalid', 'true'),
  );
  assert.match(
    ngError.message,
    /Data path "\/cli\/completion" must NOT have additional properties\(invalid\)\./,
  );

  ngError = await expectToFail(() => silentNg('config', '--global', 'cli.cache.enabled', 'true'));
  assert.match(ngError.message, /Data path "\/cli" must NOT have additional properties\(cache\)\./);

  ngError = await expectToFail(() => silentNg('config', 'cli.completion.prompted'));
  assert.match(ngError.message, /Value cannot be found\./);

  await ng('config', '--global', 'cli.completion.prompted', 'true');
  const { stdout } = await silentNg('config', '--global', 'cli.completion.prompted');
  assert.match(stdout, /true/);

  await expectFileToExist(path.join(homedir(), '.angular-config.json'));
  await deleteFile(path.join(homedir(), '.angular-config.json'));
}
