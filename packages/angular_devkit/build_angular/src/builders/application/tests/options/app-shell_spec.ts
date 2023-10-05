/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

const appShellRouteFiles: Record<string, string> = {
  'src/styles.css': `p { color: #000 }`,
  'src/app/app-shell/app-shell.component.ts': `
    import { Component } from '@angular/core';

    @Component({
      selector: 'app-app-shell',
      styles: ['div { color: #fff; }'],
      template: '<p>app-shell works!</p>',
    })
    export class AppShellComponent {}`,
  'src/main.server.ts': `
    import { AppServerModule } from './app/app.module.server';
    export default AppServerModule;
  `,
  'src/app/app.module.ts': `
    import { BrowserModule } from '@angular/platform-browser';
    import { NgModule } from '@angular/core';

    import { AppRoutingModule } from './app-routing.module';
    import { AppComponent } from './app.component';
    import { RouterModule } from '@angular/router';

    @NgModule({
      declarations: [
        AppComponent
      ],
      imports: [
        BrowserModule,
        AppRoutingModule,
        RouterModule
      ],
      bootstrap: [AppComponent]
    })
    export class AppModule { }
  `,
  'src/app/app.module.server.ts': `
    import { NgModule } from '@angular/core';
    import { ServerModule } from '@angular/platform-server';

    import { AppModule } from './app.module';
    import { AppComponent } from './app.component';
    import { Routes, RouterModule } from '@angular/router';
    import { AppShellComponent } from './app-shell/app-shell.component';

    const routes: Routes = [ { path: 'shell', component: AppShellComponent }];

    @NgModule({
      imports: [
        AppModule,
        ServerModule,
        RouterModule.forRoot(routes),
      ],
      bootstrap: [AppComponent],
      declarations: [AppShellComponent],
    })
    export class AppServerModule {}
  `,
  'src/main.ts': `
    import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
    import { AppModule } from './app/app.module';

    platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.log(err));
  `,
  'src/app/app-routing.module.ts': `
    import { NgModule } from '@angular/core';
    import { Routes, RouterModule } from '@angular/router';

    const routes: Routes = [];

    @NgModule({
      imports: [RouterModule.forRoot(routes)],
      exports: [RouterModule]
    })
    export class AppRoutingModule { }
  `,
  'src/app/app.component.html': `<router-outlet></router-outlet>`,
};

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  beforeEach(async () => {
    await harness.modifyFile('src/tsconfig.app.json', (content) => {
      const tsConfig = JSON.parse(content);
      tsConfig.files ??= [];
      tsConfig.files.push('main.server.ts');

      return JSON.stringify(tsConfig);
    });

    await harness.writeFiles(appShellRouteFiles);
  });

  describe('Option: "appShell"', () => {
    it('renders the application shell', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        appShell: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      harness.expectFile('dist/browser/main.js').toExist();
      const indexFileContent = harness.expectFile('dist/browser/index.html').content;
      indexFileContent.toContain('app-shell works!');
      indexFileContent.toContain('ng-server-context="app-shell"');
    });

    it('critical CSS is inlined', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        appShell: true,
        styles: ['src/styles.css'],
        optimization: {
          styles: {
            minify: true,
            inlineCritical: true,
          },
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const indexFileContent = harness.expectFile('dist/browser/index.html').content;
      indexFileContent.toContain('app-shell works!');
      indexFileContent.toContain('p{color:#000}');
      indexFileContent.toContain(
        `<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">`,
      );
    });

    it('applies CSP nonce to critical CSS', async () => {
      await harness.modifyFile('src/index.html', (content) =>
        content.replace(/<app-root/g, '<app-root ngCspNonce="{% nonce %}" '),
      );
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        server: 'src/main.server.ts',
        polyfills: ['zone.js'],
        appShell: true,
        styles: ['src/styles.css'],
        optimization: {
          styles: {
            minify: true,
            inlineCritical: true,
          },
        },
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      const indexFileContent = harness.expectFile('dist/browser/index.html').content;
      indexFileContent.toContain('app-shell works!');
      indexFileContent.toContain('p{color:#000}');
      indexFileContent.toContain(
        `<link rel="stylesheet" href="styles.css" media="print" ngCspMedia="all">`,
      );
      indexFileContent.toContain('<style nonce="{% nonce %}">p{color:#000}');
      indexFileContent.toContain('<style nonce="{% nonce %}" ng-app-id="ng">');
      indexFileContent.toContain('<app-root ngcspnonce="{% nonce %}"');
    });
  });
});
