import {Component, ViewEncapsulation} from '@angular/core';
import {RouteConfig} from '@angular/router-deprecated';

// Require our Universal App
import {App, Home, About} from './app';

@Component({
  selector: 'server-only-app',
  template: `
  <footer>{{ seo }}</footer>
  `
})
export class ServerOnlyApp {
  seo = 'Angular 2 Universal - server only rendered component';
}

@Component({
  selector: 'html',
  directives: [
    App,
    ServerOnlyApp
  ],
  providers: [

  ],
  encapsulation: ViewEncapsulation.None,
  template: `
  <head>
    <title>{{ seo.title }}</title>
    <meta charset="UTF-8">
    <meta name="description" content="Angular 2 Universal">
    <meta name="keywords" content="Angular 2,Universal">
    <meta name="author" content="PatrickJS">
    <link rel="icon" href="data:;base64,iVBORw0KGgo=">

    <universal-styles></universal-styles>

  </head>
  <body>
    <app>
      Loading...
    </app>
    <server-only-app>
      Loading...
    </server-only-app>

    <!-- Browser polyfills -->
    <script src="/node_modules/zone.js/dist/zone.js"></script>
    <script src="/node_modules/reflect-metadata/Reflect.js"></script>
    <!-- SystemJS -->
    <script src="/node_modules/systemjs/dist/system.js"></script>
    <script type="text/javascript">
    System.config({
      baseURL: '/',
      defaultJSExtensions: true,
      map: {
        'angular2-universal': 'node_modules/angular2-universal',
        '@angular': 'node_modules/@angular'
      },
      packages: {
        'angular2-universal/polyfills': {
          format: 'cjs',
          main: 'dist/polyfills',
          defaultExtension: 'js'
        },
        'angular2-universal': {
          format: 'cjs',
          main: 'dist/browser/index',
          defaultExtension: 'js'
        },
        '@angular/core': {
          format: 'cjs',
          main: 'index',
          defaultExtension: 'js'
        },
        '@angular/router-deprecated': {
          format: 'cjs',
          main: 'index',
          defaultExtension: 'js'
        },
        '@angular/platform-browser': {
          format: 'cjs',
          main: 'index',
          defaultExtension: 'js'
        },
        '@angular/platform-browser-dynamic': {
          format: 'cjs',
          main: 'index',
          defaultExtension: 'js'
        },
        '@angular/http': {
          format: 'cjs',
          main: 'index',
          defaultExtension: 'js'
        },
        '@angular/common': {
          format: 'cjs',
          main: 'index',
          defaultExtension: 'js'
        },
        '@angular/compiler': {
          format: 'cjs',
          main: 'index',
          defaultExtension: 'js'
        }
      }
    });
    System.import("/examples/src/universal/html/browser")
      .then(function(module) {
        return module.main();
      })
      .then(function() {
        if ('preboot' in window) { preboot.complete(); }
      });
    </script>
  </body>
  `
})
@RouteConfig([
  { path: '/', component: Home, name: 'Home', useAsDefault: true },
  { path: '/home', component: Home, name: 'Home' },
  { path: '/about', component: About, name: 'About' },
  { path: '/**', redirectTo: ['Home'] }
])
export class Html {
  seo = {
    src: '/examples/src/universal/html/browser.js',
    title: 'Angular 2 Universal Starter - this component replaces the title element'
  };

}
