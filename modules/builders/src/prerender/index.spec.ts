/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { createArchitect, host, outputPathBrowser } from '../../testing/utils';
import { join, virtualFs } from '@angular-devkit/core';

describe('Prerender Builder', () => {
  const target = { project: 'app', target: 'prerender' };
  let architect: Architect;
  const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;

  beforeAll(() => jasmine.DEFAULT_TIMEOUT_INTERVAL = 80000);
  afterAll(() => jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout);


  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(async () => {
    await host.restore().toPromise();
  });

  it('fails with error when no routes are provided', async () => {
    const run = await architect.scheduleTarget(target);
    await expectAsync(run.result)
      .toBeRejectedWith(
        jasmine.objectContaining({ message: jasmine.stringMatching(`Data path "" should have required property 'routes'.`) })
      );
    await run.stop();
  });

  it('should generate output for route when provided', async () => {
    const run = await architect.scheduleTarget(target, { routes: ['foo'] });
    const output = await run.result;
    expect(output.success).toBe(true);

    const content = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'foo/index.html'))
    );

    expect(content).toContain('foo works!');
    expect(content).toContain('This page was prerendered with Angular Universal');
    await run.stop();
  });

  it(`should generate routes and backup 'index.html' when route is ''`, async () => {
    const run = await architect.scheduleTarget(target, { routes: ['foo', ''] });
    const output = await run.result;
    expect(output.success).toBe(true);

    let content = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'foo/index.html'))
    );
    expect(content).toContain('foo works!');

    content = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'index.original.html'))
    );
    expect(content).not.toContain('<router-outlet');

    content = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'index.html'))
    );

    expect(content).toContain('<router-outlet');
    await run.stop();
  });
});
