/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, virtualFs } from '@angular-devkit/core';
import { createArchitect, host, outputPathBrowser } from '../../testing/utils';

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

  it('fails with error when .routes nor .routesFile are defined', async () => {
    const run = await architect.scheduleTarget(target);
    await expectAsync(run.result)
      .toBeRejectedWith(
        jasmine.objectContaining({ message: jasmine.stringMatching(/Data path "" should match some schema in anyOf./) })
      );
    await run.stop();
  });

  it('fails with error when no routes are provided', async () => {
    const run = await architect.scheduleTarget(target, { routes: [], guessRoutes: false });
    await expectAsync(run.result).toBeRejectedWith(
      jasmine.objectContaining({ message: jasmine.stringMatching(/No routes found/)})
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

  it('should generate output for routes when provided with a file', async () => {
    await host.write(
      join(host.root(), 'routes-file.txt'),
      virtualFs.stringToFileBuffer(
        ['/foo', '/foo/bar'].join('\n')
      ),
    ).toPromise();
    const run = await architect.scheduleTarget(target, {
      routes: ['/foo', '/'],
      routesFile: './routes-file.txt',
    });
    const output = await run.result;
    expect(output.success).toBe(true);

    const fooContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'foo/index.html'))
    );
    const fooBarContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'foo/bar/index.html'))
    );
    const appContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'index.html'))
    );

    expect(appContent).toContain('app app is running!');
    expect(appContent).toContain('This page was prerendered with Angular Universal');

    expect(fooContent).toContain('foo works!');
    expect(fooContent).toContain('This page was prerendered with Angular Universal');

    expect(fooBarContent).toContain('foo-bar works!');
    expect(fooBarContent).toContain('This page was prerendered with Angular Universal');

    await run.stop();
  });

  it('should halt execution if a route file is given but does not exist.', async () => {
    const run = await architect.scheduleTarget(target, {
      routesFile: './nonexistent-file.txt',
    });
    await expectAsync(run.result).toBeRejectedWith(
      jasmine.objectContaining({ message: jasmine.stringMatching(/no such file or directory/)})
    );
    await run.stop();
  });

  it('should guess routes to prerender when guessRoutes is set to true.', async () => {
    const run = await architect.scheduleTarget(target, {
      routes: ['/foo'],
      guessRoutes: true,
    });

    const output = await run.result;

    const fooContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'foo/index.html'))
    );
    const fooBarContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'foo/bar/index.html'))
    );
    const appContent = virtualFs.fileBufferToString(
      host.scopedSync().read(join(outputPathBrowser, 'index.html'))
    );

    expect(output.success).toBe(true);

    expect(appContent).toContain('app app is running!');
    expect(appContent).toContain('This page was prerendered with Angular Universal');

    expect(fooContent).toContain('foo works!');
    expect(fooContent).toContain('This page was prerendered with Angular Universal');

    expect(fooBarContent).toContain('foo-bar works!');
    expect(fooBarContent).toContain('This page was prerendered with Angular Universal');

    await run.stop();
  });
});
