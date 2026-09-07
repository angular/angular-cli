import assert from 'node:assert/strict';
import { applyVitestBuilder } from '../../utils/vitest';
import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { updateJsonFile } from '../../utils/project';

export default async function (): Promise<void> {
  await applyVitestBuilder({
    playwright: true,
  });
  await ng('generate', 'component', 'my-comp');

  await writeFile(
    'src/setup1.ts',
    `
      import { getTestBed } from '@angular/core/testing';

      getTestBed().configureTestingModule({});
    `,
  );

  await updateJsonFile('tsconfig.spec.json', (json) => {
    json.include = [...(json.include || []), 'src/setup1.ts'];
  });

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
