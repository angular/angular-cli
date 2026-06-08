import assert from 'node:assert/strict';
import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  await expectToFail(() => ng('config', 'schematics.@schematics/angular.component.inlineStyle'));
  await ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'false');
  const { stdout } = await ng('config', 'schematics.@schematics/angular.component.inlineStyle');
  assert.match(stdout, /false\n?/);

  await ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'true');
  const { stdout: stdout1 } = await ng(
    'config',
    'schematics.@schematics/angular.component.inlineStyle',
  );
  assert.match(stdout1, /true\n?/);

  await ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'false');
  const { stdout: stdout2 } = await ng(
    'config',
    `projects.test-project.architect.build.options.assets[0]`,
  );
  assert.ok(stdout2.includes('"input": "public"'));

  const { stdout: stdout3 } = await ng(
    'config',
    `projects["test-project"].architect.build.options.assets[0]`,
  );
  assert.ok(stdout3.includes('"input": "public"'));

  // should print all config when no positional args are provided.
  const { stdout: stdout4 } = await ng('config');
  assert.ok(stdout4.includes('$schema'));
}
