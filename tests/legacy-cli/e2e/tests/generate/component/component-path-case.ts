import { join } from 'path';
import { ng } from '../../../utils/process';
import { expectFileToExist, rimraf } from '../../../utils/fs';

export default async function () {
  const upperDirs = join('non', 'existing', 'dir');
  const rootDir = join('src', 'app', upperDirs);

  const componentDirectory = join(rootDir, 'test-component');
  const componentTwoDirectory = join(rootDir, 'test-component-two');

  try {
    // Generate a component
    await ng('generate', 'component', `${upperDirs}/test-component`);

    // Ensure component is created in the correct location relative to the workspace root
    await expectFileToExist(join(componentDirectory, 'test-component.component.ts'));
    await expectFileToExist(join(componentDirectory, 'test-component.component.spec.ts'));
    await expectFileToExist(join(componentDirectory, 'test-component.component.html'));
    await expectFileToExist(join(componentDirectory, 'test-component.component.css'));

    // Generate another component
    await ng('generate', 'component', `${upperDirs}/Test-Component-Two`);

    // Ensure component is created in the correct location relative to the workspace root
    await expectFileToExist(join(componentTwoDirectory, 'test-component-two.component.ts'));
    await expectFileToExist(join(componentTwoDirectory, 'test-component-two.component.spec.ts'));
    await expectFileToExist(join(componentTwoDirectory, 'test-component-two.component.html'));
    await expectFileToExist(join(componentTwoDirectory, 'test-component-two.component.css'));

    // Ensure unit test execute and pass
    await ng('test', '--watch=false');
  } finally {
    // Windows CI may fail to clean up the created directory
    // Resolves: "Error: Running "cmd.exe /c git clean -df" returned error code 1"
    await rimraf(rootDir);
  }
}
