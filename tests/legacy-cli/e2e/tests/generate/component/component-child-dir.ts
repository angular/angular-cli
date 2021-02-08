import { join } from 'path';
import { ng } from '../../../utils/process';
import { createDir, expectFileToExist, rimraf } from '../../../utils/fs';

export default async function () {
  const currentDirectory = process.cwd();
  const childDirectory = join('src', 'app', 'sub-dir');

  try {
    // Create and enter a child directory inside the project
    await createDir(childDirectory);
    process.chdir(childDirectory);

    // Generate a component inside the child directory
    await ng('generate', 'component', 'test-component');

    // Move back to the root of the workspacee
    process.chdir(currentDirectory);

    // Ensure component is created in the correct location relative to the workspace root
    const componentDirectory = join(childDirectory, 'test-component');
    await expectFileToExist(join(componentDirectory, 'test-component.component.ts'));
    await expectFileToExist(join(componentDirectory, 'test-component.component.spec.ts'));
    await expectFileToExist(join(componentDirectory, 'test-component.component.html'));
    await expectFileToExist(join(componentDirectory, 'test-component.component.css'));

    // Ensure unit test execute and pass
    await ng('test', '--watch=false');
  } finally {
    // Windows CI may fail to clean up the created directory
    // Resolves: "Error: Running "cmd.exe /c git clean -df" returned error code 1"
    await rimraf(childDirectory);
  }
}
