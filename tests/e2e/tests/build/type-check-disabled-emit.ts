import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { readFile, writeFile } from '../../utils/fs';
import { execWithEnv, ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

const OUTPUT_DIR = 'dist/test-project/browser';

async function readEmittedJs(): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  for (const file of (await readdir(OUTPUT_DIR)).sort()) {
    if (file.endsWith('.js')) {
      contents.set(file, await readFile(`${OUTPUT_DIR}/${file}`));
    }
  }

  return contents;
}

/**
 * Verifies that disabling type checking (`NG_BUILD_TYPE_CHECK=0`) does not change the
 * emitted JavaScript. When type checking is disabled, the AOT compilation skips the
 * semantic "affected files" walk in the isolatedModules fast path (its only remaining
 * consumers are diagnostics, which are already suppressed). The emitted output must remain
 * byte-for-byte identical to a type-checked build.
 */
export default async function () {
  // Disable the persistent disk cache so both builds are cold and independent, keeping the
  // comparison free of incremental state carried over between the two runs.
  await updateJsonFile('angular.json', (config) => {
    config.cli ??= {};
    config.cli.cache = { enabled: false };
  });

  // A type-only cross-file dependency. The interface is used solely as a type (and in the
  // template via `user.name`), so it is fully erased from the emitted JS. This is exactly the
  // kind of cross-file type relationship that the affected-file walk would type-check.
  await writeFile(
    'src/app/user.model.ts',
    'export interface User {\n  id: number;\n  name: string;\n}\n',
  );

  // Root component with both a template and the type-only dependency above.
  await writeFile(
    'src/app/app.ts',
    [
      `import { Component, signal } from '@angular/core';`,
      `import { RouterOutlet } from '@angular/router';`,
      `import type { User } from './user.model';`,
      ``,
      `@Component({`,
      `  selector: 'app-root',`,
      `  imports: [RouterOutlet],`,
      `  template: '<h1>Hello, {{ user.name }}</h1><router-outlet />',`,
      `})`,
      `export class App {`,
      `  protected readonly title = signal('test-project');`,
      `  protected readonly user: User = { id: 1, name: 'Angular' };`,
      `}`,
      ``,
    ].join('\n'),
  );

  // Baseline: type checking enabled (default). The affected-file walk runs.
  await ng('build', '--configuration=development', '--output-hashing=none');
  const withTypeChecking = await readEmittedJs();

  // Sanity check that the component (and therefore real emit) is present in the baseline,
  // so an all-empty comparison cannot pass trivially.
  assert.ok(
    [...withTypeChecking.values()].some((contents) => contents.includes('Angular')),
    'Expected the baseline build to emit the component.',
  );

  // Type checking disabled: the affected-file walk is skipped in the isolatedModules fast
  // path. The emitted output must be byte-for-byte identical to the baseline.
  await execWithEnv('ng', ['build', '--configuration=development', '--output-hashing=none'], {
    ...process.env,
    NG_BUILD_TYPE_CHECK: '0',
  });
  const withoutTypeChecking = await readEmittedJs();

  assert.deepStrictEqual(
    [...withoutTypeChecking.keys()],
    [...withTypeChecking.keys()],
    'Disabling type checking must not change the set of emitted JS files.',
  );

  for (const [file, baseline] of withTypeChecking) {
    assert.strictEqual(
      withoutTypeChecking.get(file),
      baseline,
      `Emitted output for "${file}" changed when type checking was disabled.`,
    );
  }
}
