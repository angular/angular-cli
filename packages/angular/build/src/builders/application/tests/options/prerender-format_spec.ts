/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { OutputMode, PrerenderFormat } from '../../schema';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder, expectLog } from '../setup';

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

    @Component({ selector: 'app-not-found', template: '<p>not-found works!</p>' })
    export class NotFoundComponent {}

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

  async function addRoutes(routes: string): Promise<void> {
    await harness.modifyFile('src/app/app.routes.ts', (content) =>
      content.replace(
        `{ path: 'foo', component: FooComponent },`,
        `{ path: 'foo', component: FooComponent },\n${routes}`,
      ),
    );
  }

  describe('Option: "prerenderFormat"', () => {
    it(`should write routes to '<route>/index.html' by default`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        prerender: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/index.html').content.toContain('home works!');
      harness.expectFile('dist/browser/foo/index.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/bar/index.html').content.toContain('foo-bar works!');
      harness.expectFile('dist/browser/foo.html').toNotExist();
    });

    it(`should write routes to '<route>.html' when set to 'file'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        prerender: true,
        prerenderFormat: PrerenderFormat.File,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/index.html').content.toContain('home works!');
      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/bar.html').content.toContain('foo-bar works!');
      harness.expectFile('dist/browser/foo/index.html').toNotExist();
      harness.expectFile('dist/browser/foo/bar/index.html').toNotExist();
    });

    it(`should support 'file' with 'outputMode' set to 'static' and an 'ssr' entry`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Static,
        ssr: { entry: 'src/server.ts' },
        prerenderFormat: PrerenderFormat.File,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/index.html').content.toContain('home works!');
      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/bar.html').content.toContain('foo-bar works!');
      harness
        .expectFile('dist/browser/old-foo.html')
        .content.toContain('<meta http-equiv="refresh" content="0; url=/foo">');
      harness.expectFile('dist/browser/foo/index.html').toNotExist();
      harness.expectDirectory('dist/server').toNotExist();

      const content = harness.readFile('dist/prerendered-routes.json');
      expect(Object.keys(JSON.parse(content).routes)).toEqual(
        jasmine.arrayContaining(['/', '/foo', '/foo/bar']),
      );
    });

    it(`should remove the 'baseHref' from the file names when set to 'file'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Static,
        baseHref: '/app/',
        prerenderFormat: PrerenderFormat.File,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/index.html').content.toContain('<base href="/app/">');
      harness.expectFile('dist/browser/index.html').content.toContain('home works!');
      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/bar.html').content.toContain('foo-bar works!');
      harness.expectFile('dist/browser/app.html').toNotExist();
      harness.expectFile('dist/browser/app/foo.html').toNotExist();
    });

    it(`should keep 'index.html' for the source locale and each locale when set to 'file'`, async () => {
      harness.useProject('test', {
        root: '.',
        sourceRoot: 'src',
        cli: {
          cache: {
            enabled: false,
          },
        },
        i18n: {
          sourceLocale: {
            code: 'en-US',
            subPath: '',
          },
          locales: {
            'fr': {
              translation: 'src/locales/messages.fr.xlf',
              subPath: 'fr',
            },
            'de': {
              translation: 'src/locales/messages.de.xlf',
              subPath: 'deutsch',
            },
          },
        },
      });

      await harness.writeFiles({
        'src/locales/messages.fr.xlf': EMPTY_TRANSLATION_FILE_CONTENT,
        'src/locales/messages.de.xlf': EMPTY_TRANSLATION_FILE_CONTENT.replace(
          'target-language="fr"',
          'target-language="de"',
        ),
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Static,
        localize: true,
        prerenderFormat: PrerenderFormat.File,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/index.html').content.toContain('<base href="/">');
      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/bar.html').content.toContain('foo-bar works!');

      harness.expectFile('dist/browser/fr/index.html').content.toContain('<base href="/fr/">');
      harness.expectFile('dist/browser/fr/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/fr/fr.html').toNotExist();

      harness
        .expectFile('dist/browser/deutsch/index.html')
        .content.toContain('<base href="/deutsch/">');
      harness.expectFile('dist/browser/deutsch/foo/bar.html').content.toContain('foo-bar works!');
      harness.expectFile('dist/browser/deutsch/deutsch.html').toNotExist();
    });

    it(`should keep '<route>/index.html' with a warning for routes named 'index' when set to 'file'`, async () => {
      await addRoutes(`
        { path: 'index', component: FooComponent },
        { path: 'foo/Index', component: BarComponent },
      `);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Static,
        prerenderFormat: PrerenderFormat.File,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expectLog(
        logs,
        `Route '/index' is written to 'index/index.html' because 'index.html' would be served for '/'.`,
      );
      expectLog(
        logs,
        `Route '/foo/Index' is written to 'foo/Index/index.html' because 'foo/Index.html' ` +
          `would be served for '/foo/'.`,
      );

      harness.expectFile('dist/browser/index.html').content.toContain('home works!');
      harness.expectFile('dist/browser/index/index.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/Index/index.html').content.toContain('foo-bar works!');
      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/foo/index.html').toNotExist();
    });

    it(`should keep '<route>/index.html' with a warning for a route named like the index file when set to 'file'`, async () => {
      await addRoutes(`{ path: '404', component: NotFoundComponent },`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Static,
        index: { input: 'src/index.html', output: '404.html' },
        prerenderFormat: PrerenderFormat.File,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expectLog(
        logs,
        `Route '/404' is written to '404/index.html' because '404.html' is the index file ` +
          `of the application.`,
      );

      harness.expectFile('dist/browser/404/index.html').content.toContain('not-found works!');
      harness.expectFile('dist/browser/404.html').content.toContain('<app-root></app-root>');
      harness.expectFile('dist/browser/404.html').content.not.toContain('not-found works!');
      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
    });

    it(`should keep '<route>/index.html' with a warning for routes with the same file name when set to 'file'`, async () => {
      await addRoutes(`{ path: 'Foo', component: BarComponent },`);

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        outputMode: OutputMode.Static,
        prerenderFormat: PrerenderFormat.File,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      expectLog(
        logs,
        `Route '/Foo' is written to 'Foo/index.html' because 'Foo.html' is already used by ` +
          `route '/foo'.`,
      );

      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/Foo/index.html').content.toContain('foo-bar works!');
    });

    it(`should write a root route written as '/.' to 'index.html' when set to 'file'`, async () => {
      await harness.writeFile('src/routes.txt', '.\nfoo\n');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        prerender: {
          discoverRoutes: false,
          routesFile: 'src/routes.txt',
        },
        prerenderFormat: PrerenderFormat.File,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/index.html').content.toContain('home works!');
      harness.expectFile('dist/browser/foo.html').content.toContain('foo works!');
      harness.expectFile('dist/browser/..html').toNotExist();
    });

    for (const [description, serverOptions] of [
      ["'outputMode' is set to 'server'", { outputMode: OutputMode.Server }],
      ["server-side rendering is used without 'outputMode'", { prerender: true }],
    ] as const) {
      it(`should warn and write '<route>/index.html' when set to 'file' and ${description}`, async () => {
        harness.useTarget('build', {
          ...BASE_OPTIONS,
          server: 'src/main.server.ts',
          polyfills: ['zone.js'],
          ssr: { entry: 'src/server.ts' },
          ...serverOptions,
          prerenderFormat: PrerenderFormat.File,
        });

        const { result, logs } = await harness.executeOnce();
        expect(result?.success).toBeTrue();

        expectLog(
          logs,
          'The "prerenderFormat" option set to "file" is not considered when the build produces a server',
        );

        harness.expectFile('dist/browser/foo/index.html').content.toContain('foo works!');
        harness.expectFile('dist/browser/foo.html').toNotExist();
      });
    }
  });
});

const EMPTY_TRANSLATION_FILE_CONTENT = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file target-language="fr" datatype="plaintext" original="ng2.template">
    <body>
    </body>
  </file>
</xliff>
`;
