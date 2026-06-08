import { createDir, moveFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { assertIsError } from '../../utils/utils';

export default async function () {
  await createDir('node_modules/@angular-devkit/build-angular/node_modules');
  let originalInRootNodeModules = true;

  try {
    await moveFile(
      'node_modules/@ngtools',
      'node_modules/@angular-devkit/build-angular/node_modules/@ngtools',
    );
  } catch (e) {
    assertIsError(e);

    if (e.code !== 'ENOENT') {
      throw e;
    }

    // In some cases due to module resolution '@ngtools' might already been under `@angular-devkit/build-angular`.
    originalInRootNodeModules = false;
    await moveFile(
      'node_modules/@angular-devkit/build-angular/node_modules/@ngtools',
      'node_modules/@ngtools',
    );
  }

  await ng('build', '--configuration=development');

  // Move it back.
  await moveBack(originalInRootNodeModules);
}

function moveBack(originalInRootNodeModules: Boolean): Promise<void> {
  return originalInRootNodeModules
    ? moveFile(
        'node_modules/@angular-devkit/build-angular/node_modules/@ngtools',
        'node_modules/@ngtools',
      )
    : moveFile(
        'node_modules/@ngtools',
        'node_modules/@angular-devkit/build-angular/node_modules/@ngtools',
      );
}
