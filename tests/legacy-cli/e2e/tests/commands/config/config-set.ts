import { ng, silentNg } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  let ngError: Error;

  ngError = await expectToFail(() => silentNg('config', 'cli.warnings.zzzz', 'true'));
  if (
    !ngError.message.includes(
      'Data path "/cli/warnings" must NOT have additional properties(zzzz).',
    )
  ) {
    throw new Error('Should have failed with must NOT have additional properties(zzzz).');
  }

  ngError = await expectToFail(() => silentNg('config', 'cli.warnings.zzzz'));
  if (!ngError.message.includes('Value cannot be found.')) {
    throw new Error('Should have failed with Value cannot be found.');
  }

  await ng('config', 'cli.warnings.versionMismatch', 'false');
  const { stdout } = await ng('config', 'cli.warnings.versionMismatch');
  if (!stdout.includes('false')) {
    throw new Error(`Expected "false", received "${JSON.stringify(stdout)}".`);
  }

  await ng('config', 'cli.packageManager', 'yarn');
  const { stdout: stdout2 } = await ng('config', 'cli.packageManager');
  if (!stdout2.includes('yarn')) {
    throw new Error(`Expected "yarn", received "${JSON.stringify(stdout2)}".`);
  }

  await ng('config', 'schematics', '{"@schematics/angular:component":{"style": "scss"}}');
  const { stdout: stdout3 } = await ng('config', 'schematics.@schematics/angular:component.style');
  if (!stdout3.includes('scss')) {
    throw new Error(`Expected "scss", received "${JSON.stringify(stdout3)}".`);
  }

  await ng('config', 'schematics');
  await ng('config', 'schematics', 'undefined');
  await expectToFail(() => ng('config', 'schematics'));
}
