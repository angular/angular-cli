/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { Format, OutputMode } from '../../schema';
import {
  APPLICATION_BUILDER_INFO,
  BASE_OPTIONS,
  describeBuilder,
  expectLog,
  expectNoLog,
} from '../setup';

const routeFiles: Record<string, string> = {
  'src/app/app.module.ts': `
    import { NgModule } from '@angular/core';
    import { BrowserModule } from '@angular/platform-browser';
    import { RouterModule } from '@angular/router';
    import { AppComponent } from './app.component';
    import { routes } from './app.routes';

    @NgModule({
      declarations: [AppComponent],
      imports: [BrowserModule, RouterModule.forRoot(routes)],
      bootstrap: [AppComponent],
    })
    export class AppModule {}
  `,
  'src/app/app.routes.ts': `
    import { Component } from '@angular/core';
    import { Routes } from '@angular/router';

    @Component({ selector: 'app-home', template: '<p>home works!</p>' })
    export class HomeComponent {}

    @Component({ selector: 'app-foo', template: '<p>foo works!</p>' })
    export class FooComponent {}

    @Component({ selector: 'app-bar', template: '<p>foo-bar works!</p>' })
    export class BarComponent {}

    export const routes: Routes = [
      { path: '', component: HomeComponent },
      { path: 'foo', component: FooComponent },
      { path: 'foo/bar', component: BarComponent },
      { path: 'old-foo', redirectTo: 'foo' },
    ];
  `,
  'src/app/app.component.html': `<router-outlet></router-outlet>`,
  'src/server.ts': `console.log('Hello!');`,
};

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  beforeEach(async () => {
    await harness.modifyFile('src/tsconfig.app.json', (content) => {
      const tsConfig = JSON.parse(content);
      tsConfig.files ??= [];
      tsConfig.files.push('main.server.ts', 'server.ts');

      return JSON.stringify(tsConfig);
    });

    await harness.writeFiles(routeFiles);
  });

  describe('Option: "prerender.format"', () => {
    it(`should write routes to '<route>.html' when set to 'file'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Static,
        prerender: { format: Format.File },
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectNoLog(logs, 'The "prerender" option is not considered');

      harness.expectFile('dist/browser/index.html').content.toContain('home works!');
      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/bar.html').content.toContain('foo-bar works!');
      harness
        .expectFile('dist/browser/old-foo.html')
        .content.toContain('<meta http-equiv="refresh" content="0; url=/foo">');
      harness.expectFile('dist/browser/foo/index.html').toNotExist();

      const content = harness.readFile('dist/prerendered-routes.json');
      expect(Object.keys(JSON.parse(content).routes)).toEqual(
        jasmine.arrayContaining(['/', '/foo', '/foo/bar']),
      );
    });

    it(`should write routes to '<route>/index.html' by default`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Static,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/index.html').content.toContain('home works!');
      harness.expectFile('dist/browser/foo/index.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/bar/index.html').content.toContain('foo-bar works!');
      harness.expectFile('dist/browser/foo.html').toNotExist();
    });

    it(`should warn and write '<route>/index.html' when set to 'file' and the build produces a server`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Server,
        ssr: { entry: 'src/server.ts' },
        prerender: { format: Format.File },
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expectLog(
        logs,
        'The "prerender.format" option set to "file" is not considered when the build produces a server',
      );

      harness.expectFile('dist/browser/foo/index.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo.html').toNotExist();
    });
  });
});
