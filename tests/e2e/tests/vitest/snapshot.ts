import { execWithEnv, ng } from '../../utils/process';
import { replaceInFile, readFile, writeFile } from '../../utils/fs';
import { applyVitestBuilder } from '../../utils/vitest';
import assert from 'node:assert/strict';
import { stripVTControlCharacters } from 'node:util';

export default async function () {
  // Set up the test project to use the vitest runner
  await applyVitestBuilder();

  // Add snapshot assertions to the test file
  await replaceInFile(
    'src/app/app.spec.ts',
    `describe('App', () => {`,
    `
describe('App', () => {
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

  // Synchronize line endings for Vitest which currently may miscalculate line counts
  // with mixed file line endings.
  let content = await readFile('src/app/app.spec.ts');
  content = content.replace(/\r\n/g, '\n');
  content = content.replace(/\r/g, '\n');
  await writeFile('src/app/app.spec.ts', content);

  // First run: create snapshots
  const { stdout: firstRunStdout } = await ng('test');
  assert.match(
    stripVTControlCharacters(firstRunStdout),
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
    /exports\[`App > should match file snapshot 1`\] = `"test-project"`;/,
    'File snapshot was not written to disk.',
  );

  // Second run: tests should pass with existing snapshots
  await ng('test');

  // Modify component to break snapshots. The new title keeps the original value as a prefix so
  // the default `should render title` spec, which uses a substring assertion, continues to pass.
  // The snapshots compare the exact value and therefore still fail.
  await replaceInFile('src/app/app.ts', 'test-project', 'test-project (updated)');

  // Third run: tests should fail with snapshot mismatch
  await assert.rejects(
    () => ng('test'),
    (err: any) => {
      assert.match(
        stripVTControlCharacters(err.toString()),
        /Snapshots\s+2 failed/,
        'Expected snapshot mismatch error, but a different error occurred.',
      );
      return true;
    },
    'Snapshot mismatch did not cause the test to fail.',
  );

  // Fourth run: update the snapshots to match the new output.
  // Vitest reads the `UPDATE_SNAPSHOT` environment variable directly. The builder does not
  // currently forward Vitest's `--update` flag, so the variable is the way to request an update
  // without a Vitest configuration file.
  const { stdout: updateRunStdout } = await execWithEnv('ng', ['test'], {
    ...process.env,
    UPDATE_SNAPSHOT: 'all',
  });
  assert.match(
    stripVTControlCharacters(updateRunStdout),
    /Snapshots\s+2 updated/,
    'Snapshots were not updated when UPDATE_SNAPSHOT=all was set.',
  );

  const updatedSpecContent = await readFile('src/app/app.spec.ts');
  assert.match(
    updatedSpecContent,
    /toMatchInlineSnapshot\(`"test-project \(updated\)"`\)/,
    'Inline snapshot was not updated in the spec file.',
  );
  assert.doesNotMatch(
    updatedSpecContent,
    /toMatchInlineSnapshot\(`"test-project"`\)/,
    'Stale inline snapshot is still present in the spec file.',
  );

  const updatedSnapshotContent = await readFile('src/app/__snapshots__/app.spec.ts.snap');
  assert.match(
    updatedSnapshotContent,
    /exports\[`App > should match file snapshot 1`\] = `"test-project \(updated\)"`;/,
    'File snapshot was not updated on disk.',
  );
  assert.doesNotMatch(
    updatedSnapshotContent,
    /"test-project"/,
    'Stale file snapshot is still present on disk.',
  );

  // Fifth run: tests should pass with the updated snapshots and no snapshot should be rewritten
  const { stdout: finalRunStdout } = await ng('test');
  assert.doesNotMatch(
    stripVTControlCharacters(finalRunStdout),
    /Snapshots\s+\d+ (written|updated|failed|obsolete)/,
    'Snapshots were unexpectedly modified after being updated.',
  );
}
