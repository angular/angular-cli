import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  await expectToFail(() => ng('config', 'cli.warnings.zzzz'));
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
