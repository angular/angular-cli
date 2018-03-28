import { createDir, moveFile, copyFile, deleteFile } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  await createDir('node_modules/@angular-devkit/local/node_modules/@angular-devkit/');

  // Move the default builder so it is not acessible directly.
  await moveFile(
    'node_modules/@angular-devkit/build-webpack',
    'node_modules/@angular-devkit/local/node_modules/@angular-devkit/build-webpack'
  );

  // Copy Architect so there are two instances.
  // We want to test resolution falls back to be relative to the inner instance.
  await copyFile(
    'node_modules/@angular-devkit/architect',
    'node_modules/@angular-devkit/local/node_modules/@angular-devkit/architect'
  );

  // Check it still builds.
  await ng('build');

  // Move the builder back back.
  await moveFile(
    'node_modules/@angular-devkit/local/node_modules/@angular-devkit/build-webpack',
    'node_modules/@angular-devkit/build-webpack',
  );

  // Delete the extra Architect copy.
  await deleteFile('node_modules/@angular-devkit/local/node_modules/@angular-devkit/architect');
}
