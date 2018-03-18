/** Map of globals that are used inside of the different packages. */
export const rollupGlobals = {
  // The key here is library name, and the value is the the name of the global variable name
  // the window object.
  // See rollup/rollup/wiki/JavaScript-API#globals for more.
  '@angular/animations': 'ng.animations',
  '@angular/core': 'ng.core',
  '@angular/common': 'ng.common',
  '@angular/common/http': 'ng.common.http',
  '@angular/compiler': 'ng.compiler',
  '@angular/http': 'ng.http',
  '@angular/platform-browser': 'ng.platformBrowser',
  '@angular/platform-server': 'ng.platformServer',
  '@angular/platform-browser-dynamic': 'ng.platformBrowserDynamic',
  '@nguniversal/aspnetcore-engine/tokens': 'nguniversal.aspnetcoreEngine.tokens',
  '@nguniversal/express-engine/tokens': 'nguniversal.expressEngine.tokens',
  '@nguniversal/hapi-engine/tokens': 'nguniversal.hapiEngine.tokens',
  'rxjs/Observable': 'Rx',
  'rxjs/operators/filter': 'Rx.operators',
  'rxjs/operators/map': 'Rx.operators',
  'rxjs/operators/take': 'Rx.operators',
  'rxjs/operators/tap': 'Rx.operators',
  'rxjs/observable/of': 'Rx.Observable',
  'fs': 'fs',
  'express': 'express',
  'hapi': 'hapi'
};
