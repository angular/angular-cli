import assert from 'node:assert/strict';
import { ng, silentNg } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  let ngError: Error;

  ngError = await expectToFail(() => silentNg('config', 'cli.warnings.zzzz', 'true'));
  assert.match(
    ngError.message,
    /Data path "\/cli\/warnings" must NOT have additional properties\(zzzz\)\./,
  );

  ngError = await expectToFail(() => silentNg('config', 'cli.warnings.zzzz'));
  assert.match(ngError.message, /Value cannot be found\./);

  await ng('config', 'cli.warnings.versionMismatch', 'false');
  const { stdout } = await ng('config', 'cli.warnings.versionMismatch');
  assert.match(stdout, /false/);

  await ng('config', 'cli.packageManager', 'yarn');
  const { stdout: stdout2 } = await ng('config', 'cli.packageManager');
  assert.match(stdout2, /yarn/);

  await ng('config', 'schematics', '{"@schematics/angular:component":{"style": "scss"}}');
  const { stdout: stdout3 } = await ng('config', 'schematics.@schematics/angular:component.style');
  assert.match(stdout3, /scss/);

  await ng('config', 'schematics');
  await ng('config', 'schematics', 'undefined');
  await expectToFail(() => ng('config', 'schematics'));
}
