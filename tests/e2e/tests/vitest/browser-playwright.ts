import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';
import { installPackage } from '../../utils/packages';
import { writeFile } from '../../utils/fs';

export default async function (): Promise<void> {
  await applyVitestBuilder();
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');
  await ng('generate', 'component', 'my-comp');

  await writeFile(
    'src/setup1.ts',
    `
      import { getTestBed } from '@angular/core/testing';

      getTestBed().configureTestingModule({});
    `,
  );

  const { stdout } = await ng(
    'test',
    '--no-watch',
    '--browsers',
    'chromiumHeadless',
    '--setup-files',
    'src/setup1.ts',
  );

  assert.match(stdout, /2 passed/, 'Expected 2 tests to pass.');
}
