/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, host } from '../../testing/test-utils';

describe('Prerender Builder', () => {
  const target = { project: 'app', target: 'prerender' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    const routeFiles = {
      'src/styles.css': `
        p { color: #000 }
      `,
      'src/app/foo/foo.component.ts': `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-foo',
          standalone: false,
          template: '<p>foo works!</p>',
        })
        export class FooComponent {}
      `,
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { Routes, RouterModule } from '@angular/router';

        import { AppComponent } from './app.component';
        import { FooComponent } from './foo/foo.component';

        const routes: Routes = [ { path: 'foo', component: FooComponent }];

        @NgModule({
          declarations: [
            AppComponent,
            FooComponent
          ],
          imports: [
            BrowserModule,
            RouterModule.forRoot(routes)
          ],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
      'src/app/app.component.html': `
        app is running!
        <router-outlet></router-outlet>
      `,
    };

    host.writeMultipleFiles(routeFiles);
  });

  afterEach(async () => host.restore().toPromise());

  it('fails with error when no routes are provided', async () => {
    const run = await architect.scheduleTarget(target, { routes: [], discoverRoutes: false });
    await run.stop();

    await expectAsync(run.result).toBeRejectedWith(
      jasmine.objectContaining({
        message: jasmine.stringMatching(/Could not find any routes to prerender/),
      }),
    );
  });

  it('should generate output for route when provided', async () => {
    const run = await architect.scheduleTarget(target, { routes: ['foo'] });
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);

    const content = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/foo/index.html')),
    );

    expect(content).toContain('foo works!');
    expect(content).toContain('ng-server-context="ssg"');
  });

  it(`should generate routes and backup 'index.html' when route is ''`, async () => {
    const run = await architect.scheduleTarget(target, { routes: ['foo', ''] });
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);

    let content = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/foo/index.html')),
    );
    expect(content).toContain('foo works!');

    content = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/index.original.html')),
    );
    expect(content).not.toContain('<router-outlet');

    content = virtualFs.fileBufferToString(host.scopedSync().read(normalize('dist/index.html')));

    expect(content).toContain('<router-outlet');
  });

  it('should generate output for routes when provided with a file', async () => {
    await host
      .write(
        join(host.root(), 'routes-file.txt'),
        virtualFs.stringToFileBuffer(['/foo', '/'].join('\n')),
      )
      .toPromise();
    const run = await architect.scheduleTarget(target, {
      routes: ['/foo', '/'],
      routesFile: './routes-file.txt',
    });
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);

    const fooContent = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/foo/index.html')),
    );
    const appContent = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/index.html')),
    );

    expect(appContent).toContain('app is running!');
    expect(appContent).toContain('ng-server-context="ssg"');

    expect(fooContent).toContain('foo works!');
    expect(fooContent).toContain('ng-server-context="ssg"');
  });

  it('should halt execution if a route file is given but does not exist.', async () => {
    const run = await architect.scheduleTarget(target, {
      routesFile: './nonexistent-file.txt',
    });

    await run.stop();

    await expectAsync(run.result).toBeRejectedWith(
      jasmine.objectContaining({ message: jasmine.stringMatching(/no such file or directory/) }),
    );
  });

  it('should guess routes to prerender when discoverRoutes is set to true.', async () => {
    const run = await architect.scheduleTarget(target, {
      routes: [''],
      discoverRoutes: true,
    });

    const output = await run.result;
    const fooContent = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/foo/index.html')),
    );
    const appContent = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/index.html')),
    );

    await run.stop();

    expect(output.success).toBe(true);

    expect(appContent).toContain('app is running!');
    expect(appContent).toContain('ng-server-context="ssg"');

    expect(fooContent).toContain('foo works!');
    expect(fooContent).toContain('ng-server-context="ssg"');
  });

  it('should generate service-worker', async () => {
    const run = await architect.scheduleTarget(target, {
      routes: ['foo'],
      browserTarget: 'app:build:sw,production',
    });
    const output = await run.result;
    await run.stop();

    console.log(output.error);
    expect(output.success).toBe(true);
    expect(host.scopedSync().exists(normalize('dist/ngsw.json'))).toBeTrue();
  });

  it('should inline critical css for route', async () => {
    const run = await architect.scheduleTarget(
      { ...target, configuration: 'production' },
      { routes: ['foo'] },
    );
    const output = await run.result;
    await run.stop();

    expect(output.success).toBe(true);

    const content = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('dist/foo/index.html')),
    );

    expect(content).toMatch(
      /<style>p{color:#000}<\/style><link rel="stylesheet" href="styles\.\w+\.css" media="print" onload="this\.media='all'">/,
    );

    // Validate that critters does not process already critical css inlined stylesheets.
    expect(content).not.toContain(`onload="this.media='print'">`);
    expect(content).not.toContain(`media="print"></noscript>`);
  });
});
