import { expectFileToExist, readFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

const unexpectedStaticFieldErrorMessage =
  'Found unexpected static field. This indicates that the Safari <=v15 ' +
  'workaround for a scope variable tracking is not working. ' +
  'See: https://github.com/angular/angular-cli/pull/24357';

export default async function () {
  await updateJsonFile('angular.json', (workspace) => {
    const build = workspace.projects['test-project'].architect.build;
    build.defaultConfiguration = undefined;
    build.options = {
      ...build.options,
      optimization: false,
      outputHashing: 'none',
    };
  });

  // Matches two types of static fields that indicate that the Safari bug
  // may still occur. With the workaround this should not appear in bundles.
  //   - static { this.ecmp = bla }
  //   - static #_ = this.ecmp = bla
  const staticIndicatorRegex = /static\s+(\{|#[_\d]+\s+=)/;

  await ng('build');
  await expectFileToExist('dist/test-project/main.js');
  const mainContent = await readFile('dist/test-project/main.js');

  // TODO: This default cause can be removed in the future when Safari v15
  // is longer included in the default browserlist configuration of CLI apps.
  if (staticIndicatorRegex.test(mainContent)) {
    throw new Error(unexpectedStaticFieldErrorMessage);
  }

  await writeFile('.browserslistrc', 'last 1 chrome version');

  await ng('build');
  await expectFileToExist('dist/test-project/main.js');
  const mainContentChromeLatest = await readFile('dist/test-project/main.js');

  if (!staticIndicatorRegex.test(mainContentChromeLatest)) {
    throw new Error('Expected static fields to be used when Safari <=v15 is not targeted.');
  }

  await writeFile('.browserslistrc', 'Safari <=15');

  await ng('build');
  await expectFileToExist('dist/test-project/main.js');
  const mainContentSafari15Explicit = await readFile('dist/test-project/main.js');

  if (staticIndicatorRegex.test(mainContentSafari15Explicit)) {
    throw new Error(unexpectedStaticFieldErrorMessage);
  }
}
