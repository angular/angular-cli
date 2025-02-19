import { homedir } from 'node:os';
import * as path from 'node:path';
import { deleteFile, expectFileToExist } from '../../../utils/fs';
import { ng, node, silentNg } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';
import { isWindowsTestMode, wslpath } from '../../../utils/wsl';

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

  let homeDir = homedir();

  // In Windows test mode, we don't want to use the WSL homedir, but the
  // one of the host system.
  if (isWindowsTestMode()) {
    const homeDirWinPath = (await node('-p', 'os.homedir()')).stdout.trim();
    homeDir = wslpath('-u', `"${homeDirWinPath}"`);
  }

  await expectFileToExist(path.join(homedir(), '.angular-config.json'));
  await deleteFile(path.join(homedir(), '.angular-config.json'));
}
