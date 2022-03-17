import { ng } from '../../../utils/process';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  await expectToFail(() => ng('config', 'schematics.@schematics/angular.component.inlineStyle'));
  await ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'false');
  const { stdout } = await ng('config', 'schematics.@schematics/angular.component.inlineStyle');
  if (!stdout.match(/false\n?/)) {
    throw new Error(`Expected "false", received "${JSON.stringify(stdout)}".`);
  }

  await ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'true');
  const { stdout: stdout1 } = await ng(
    'config',
    'schematics.@schematics/angular.component.inlineStyle',
  );
  if (!stdout1.match(/true\n?/)) {
    throw new Error(`Expected "true", received "${JSON.stringify(stdout)}".`);
  }

  await ng('config', 'schematics.@schematics/angular.component.inlineStyle', 'false');
  const { stdout: stdout2 } = await ng(
    'config',
    `projects.test-project.architect.build.options.assets[0]`,
  );
  if (!stdout2.includes('src/favicon.ico')) {
    throw new Error(`Expected "src/favicon.ico", received "${JSON.stringify(stdout)}".`);
  }

  const { stdout: stdout3 } = await ng(
    'config',
    `projects["test-project"].architect.build.options.assets[0]`,
  );

  if (!stdout3.includes('src/favicon.ico')) {
    throw new Error(`Expected "src/favicon.ico", received "${JSON.stringify(stdout)}".`);
  }

  // should print all config when no positional args are provided.
  const { stdout: stdout4 } = await ng('config');
  if (!stdout4.includes('$schema')) {
    throw new Error(`Expected to contain "$schema", received "${JSON.stringify(stdout)}".`);
  }
}
