import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';
import { installPackage } from '../../utils/packages';
import { writeFile } from '../../utils/fs';

export default async function (): Promise<void> {
  await applyVitestBuilder();
  await installPackage('webdriverio@9');
  await installPackage('@vitest/browser-webdriverio@4');

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
    'chromeHeadless',
    '--setup-files',
    'src/setup1.ts',
  );

  assert.match(stdout, /2 passed/, 'Expected 2 tests to pass.');
}
