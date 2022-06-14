import { silentNg } from '../../../utils/process';
import { moveFile, copyFile } from '../../../utils/fs';

export default async function () {
  // Should accept different multiple spec files
  await moveFile('./e2e/src/app.e2e-spec.ts', './e2e/src/renamed-app.e2e-spec.ts');
  await copyFile('./e2e/src/renamed-app.e2e-spec.ts', './e2e/src/another-app.e2e-spec.ts');

  await silentNg(
    'e2e',
    'test-project',
    '--specs',
    './e2e/renamed-app.e2e-spec.ts',
    '--specs',
    './e2e/another-app.e2e-spec.ts',
  );
}
