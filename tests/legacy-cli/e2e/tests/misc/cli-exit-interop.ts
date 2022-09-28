import { createProjectFromAsset } from '../../utils/assets';
import { moveFile, replaceInFile } from '../../utils/fs';
import { noSilentNg } from '../../utils/process';
import { useCIChrome, useCIDefaults } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

/**
 * @fileoverview This tests that using the latest version of the CLI globally does not cause older (< 14)
 * versions of the CLI to never exit after completing certain commands.
 * This test will timeout in a failure condition.
 */

export default async function () {
  let restoreRegistry: (() => Promise<void>) | undefined;

  try {
    // We need to use the public registry because in the local NPM server we don't have
    // older versions @angular/cli packages which would cause `npm install` during `ng update` to fail.
    restoreRegistry = await createProjectFromAsset('13.0-project', true);

    // A missing stylesheet error will trigger the stuck process issue with v13 when building
    await moveFile('src/styles.css', 'src/styles.scss');
    await expectToFail(() => noSilentNg('build'));

    // Setup a SCSS global stylesheet
    // Simulates issue https://github.com/angular/angular-cli/issues/23289
    await replaceInFile('angular.json', /styles\.css/g, 'styles.scss');

    await useCIChrome('thirteen-project');
    await useCIDefaults('thirteen-project');
    await noSilentNg('test', '--watch=false');
  } finally {
    await restoreRegistry?.();
  }
}
