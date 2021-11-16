import { moveFile } from '../../utils/fs';
import { installPackage, uninstallPackage } from '../../utils/packages';
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
      execAndWaitForOutputToMatch('ng', ['build'], /Node packages may not be installed\./),
    );

    await moveFile('node_modules', 'temp_node_modules');

    await expectToFail(() => ng('build'));
    await execAndWaitForOutputToMatch(
      'ng',
      ['build'],
      /Could not find the '@angular-devkit\/build-angular:browser' builder's node package\./,
    );
    await execAndWaitForOutputToMatch('ng', ['build'], /Node packages may not be installed\./);
  } finally {
    await moveFile('temp_node_modules', 'node_modules');
    await installPackage('@angular-devkit/build-angular');
  }
}
