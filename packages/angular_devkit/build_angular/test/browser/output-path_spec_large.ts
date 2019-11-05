/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { getSystemPath, join, virtualFs } from '@angular-devkit/core';
import * as fs from 'fs';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder output path', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('deletes output path', async () => {
    // Write a file to the output path to later verify it was deleted.
    await host.write(
      join(host.root(), 'dist/file.txt'),
      virtualFs.stringToFileBuffer('file'),
    ).toPromise();

    // Delete an app file to force a failed compilation.
    // Failed compilations still delete files, but don't output any.
    await host.delete(join(host.root(), 'src', 'app', 'app.component.ts')).toPromise();

    const run = await architect.scheduleTarget(target);
    const output = await run.result;
    expect(output.success).toBe(false);
    expect(await host.exists(join(host.root(), 'dist')).toPromise()).toBe(false);
    await run.stop();
  });

  it('deletes output path and unlink symbolic link', async () => {
    // Write a file to the output path to later verify it was deleted.
    host.writeMultipleFiles({
      'src-link/dummy.txt': '',
      'dist/file.txt': virtualFs.stringToFileBuffer('file'),
    });

    const distLinked = join(host.root(), 'dist', 'linked');

    // create symbolic link
    fs.symlinkSync(
      getSystemPath(join(host.root(), 'src-link')),
      getSystemPath(distLinked),
      'junction',
    );

    expect(await host.exists(distLinked).toPromise()).toBe(true);

    // Delete an app file to force a failed compilation.
    // Failed compilations still delete files, but don't output any.
    await host.delete(join(host.root(), 'src', 'app', 'app.component.ts')).toPromise();
    const run = await architect.scheduleTarget(target);
    const output = await run.result;
    expect(output.success).toBe(false);

    expect(await host.exists(join(host.root(), 'dist')).toPromise()).toBe(false);
    expect(await host.exists(join(host.root(), 'src-link')).toPromise()).toBe(true);
  });

  it('does not allow output path to be project root', async () => {
    const overrides = { outputPath: './' };
    const run = await architect.scheduleTarget(target, overrides);
    try {
      await run.result;
      expect('THE ABOVE LINE SHOULD THROW').toBe('');
    } catch { }
    await run.stop();
  });

  it('works with absolute outputPath', async () => {
    const overrides = {
      outputPath: getSystemPath(join(host.root(), 'dist')),
    };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect('main.js' in files).toBe(true);
    expect('index.html' in files).toBe(true);
  });
});
