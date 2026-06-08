import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execAndCaptureError, silentExec } from '../../utils/process';
import { applyVitestBuilder } from '../../utils/vitest';
import { stripVTControlCharacters } from 'node:util';

export default async function (): Promise<void> {
  // This test uses `subst` to map the project directory to a virtual drive letter
  // to simulate running tests from a non-C drive on Windows.
  if (process.platform !== 'win32') {
    return;
  }

  await applyVitestBuilder();

  const originalCwd = process.cwd();
  const driveLetter = 'X:'; // Pick a drive letter that is unlikely to be in use.

  try {
    // 1. Map the parent directory of the project to the virtual drive.
    // This avoids running the project from the root of the drive (X:\), which can cause
    // issues with workspace detection.
    const projectParentDir = path.dirname(originalCwd);
    const projectName = path.basename(originalCwd);

    await silentExec('subst', driveLetter, projectParentDir);

    // 2. Change the current process's working directory to the project folder on the virtual drive.
    const newCwd = path.join(driveLetter + '\\', projectName);
    process.chdir(newCwd);

    // Verify that the file system mapping is working as expected.
    assert(fs.existsSync('angular.json'), 'angular.json should exist on the subst drive');

    // 3. Run `ng test`.
    // We expect this to fail with NG0203 in the subst environment due to dual-package hazards
    // (Angular loading from both X: and D:) within bazel. However, the failure proves that the
    // test file was discovered and loaded.
    const error = await execAndCaptureError('ng', ['test', '--watch=false']);
    const output = stripVTControlCharacters(error.message);

    // 4. Verify that Vitest found the test file and identified the tests within it.
    assert.match(
      output,
      /src\/app\/app\.spec\.ts \(2 tests/,
      'Expected tests to be discovered and loaded, even if execution fails due to subst aliasing.',
    );
  } finally {
    // 5. Teardown: Restore CWD and remove the virtual drive mapping.
    try {
      process.chdir(originalCwd);
    } catch (e) {
      console.error('Failed to restore CWD:', e);
    }

    try {
      await silentExec('subst', driveLetter, '/d');
    } catch (e) {
      // Ignore errors if the drive wasn't mounted or if unmount fails (best effort)
      console.error(`Failed to unmount ${driveLetter}:`, e);
    }
  }
}
