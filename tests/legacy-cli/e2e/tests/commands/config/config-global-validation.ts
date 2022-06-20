import { homedir } from 'os';
import * as path from 'path';
import { deleteFile, expectFileToExist } from '../../../utils/fs';
import { ng, silentNg } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  let ngError: Error;

  ngError = await expectToFail(() => silentNg('config', 'cli.completion.prompted', 'true'));

  if (
    !ngError.message.includes('Data path "/cli" must NOT have additional properties(completion).')
  ) {
    throw new Error('Should have failed with must NOT have additional properties(completion).');
  }

  ngError = await expectToFail(() =>
    silentNg('config', '--global', 'cli.completion.invalid', 'true'),
  );

  if (
    !ngError.message.includes(
      'Data path "/cli/completion" must NOT have additional properties(invalid).',
    )
  ) {
    throw new Error('Should have failed with must NOT have additional properties(invalid).');
  }

  ngError = await expectToFail(() => silentNg('config', '--global', 'cli.cache.enabled', 'true'));

  if (!ngError.message.includes('Data path "/cli" must NOT have additional properties(cache).')) {
    throw new Error('Should have failed with must NOT have additional properties(cache).');
  }

  ngError = await expectToFail(() => silentNg('config', 'cli.completion.prompted'));

  if (!ngError.message.includes('Value cannot be found.')) {
    throw new Error('Should have failed with Value cannot be found.');
  }

  await ng('config', '--global', 'cli.completion.prompted', 'true');
  const { stdout } = await silentNg('config', '--global', 'cli.completion.prompted');

  if (!stdout.includes('true')) {
    throw new Error(`Expected "true", received "${JSON.stringify(stdout)}".`);
  }

  await expectFileToExist(path.join(homedir(), '.angular-config.json'));
  await deleteFile(path.join(homedir(), '.angular-config.json'));
}
