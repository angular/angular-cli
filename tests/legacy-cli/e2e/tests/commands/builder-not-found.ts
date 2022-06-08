import { moveFile } from '../../utils/fs';
import { getActivePackageManager, installPackage, uninstallPackage } from '../../utils/packages';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  try {
    await uninstallPackage('@angular-devkit/build-angular');

    await expectToFail(() => ng('build'));
    await execAndWaitForOutputToMatch(
      'ng',
      ['build'],
      /Could not find the '@angular-devkit\/build-angular:browser' builder's node package\./,
    );
    await expectToFail(() =>
      execAndWaitForOutputToMatch(
        'ng',
        ['build'],
        new RegExp(
          `Node packages may not be installed\. Try installing with '${getActivePackageManager()} install'\.`,
        ),
      ),
    );

    await moveFile('node_modules', 'temp_node_modules');

    await expectToFail(() => ng('build'));
    await execAndWaitForOutputToMatch(
      'ng',
      ['build'],
      /Could not find the '@angular-devkit\/build-angular:browser' builder's node package\./,
    );
    await execAndWaitForOutputToMatch(
      'ng',
      ['build'],
      new RegExp(
        `Node packages may not be installed\. Try installing with '${getActivePackageManager()} install'\.`,
      ),
    );
  } finally {
    await moveFile('temp_node_modules', 'node_modules');
    await installPackage('@angular-devkit/build-angular');
  }
}
