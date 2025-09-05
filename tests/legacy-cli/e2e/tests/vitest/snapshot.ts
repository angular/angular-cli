import { ng } from '../../utils/process';
import { appendToFile, replaceInFile, readFile } from '../../utils/fs';
import { applyVitestBuilder } from '../../utils/vitest';
import assert from 'node:assert/strict';

export default async function () {
  // Set up the test project to use the vitest runner
  await applyVitestBuilder();

  // Add snapshot assertions to the test file
  await appendToFile(
    'src/app/app.spec.ts',
    `
    it('should match file snapshot', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      expect((app as any).title()).toMatchSnapshot();
    });

    it('should match inline snapshot', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      expect((app as any).title()).toMatchInlineSnapshot();
    });
  `,
  );

  // First run: create snapshots
  const { stdout: firstRunStdout } = await ng('test');
  assert.match(
    firstRunStdout,
    /Snapshots\s+2 written/,
    'Snapshots were not written on the first run.',
  );

  const specContent = await readFile('src/app/app.spec.ts');
  assert.match(
    specContent,
    /toMatchInlineSnapshot\(`"test-project"`\)/,
    'Inline snapshot was not written to the spec file.',
  );

  const snapshotContent = await readFile('src/app/__snapshots__/app.spec.ts.snap');
  assert.match(
    snapshotContent,
    /exports\[`should match file snapshot 1`\] = `"test-project"`;/,
    'File snapshot was not written to disk.',
  );

  // Second run: tests should pass with existing snapshots
  await ng('test');

  // Modify component to break snapshots
  await replaceInFile('src/app/app.ts', 'test-project', 'Snapshot is broken!');

  // Third run: tests should fail with snapshot mismatch
  await assert.rejects(
    () => ng('test'),
    (err: any) => {
      assert.match(
        err.toString(),
        /Snapshots\s+2 failed/,
        'Expected snapshot mismatch error, but a different error occurred.',
      );
      return true;
    },
    'Snapshot mismatch did not cause the test to fail.',
  );
}
