import {join} from 'path';
import {buildConfig} from './build-config';
import {getSubdirectoryNames} from './secondary-entry-points';

/** Method that converts dash-case strings to a camel-based string. */
export const dashCaseToCamelCase =
  (str: string) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

/** List of potential secondary entry-points for the common package. */
const commonSecondaryEntryPoints = getSubdirectoryNames(join(buildConfig.packagesDir, 'common'));

/** Object with all common entry points in the format of Rollup globals. */
const rollupCommonEntryPoints = commonSecondaryEntryPoints
  .reduce((globals: any, entryPoint: string) => {
    globals[`@${buildConfig.namespace}/common/${entryPoint}`] =
      `${buildConfig.namespace}.common.${dashCaseToCamelCase(entryPoint)}`;
    return globals;
  }, {});

/** List of potential secondary entry-points for the aspnet core engine package. */
const aspSecondaryEntryPoints = getSubdirectoryNames(join(buildConfig.packagesDir,
  'aspnetcore-engine'));

/** Object with all aspnet core engine entry points in the format of Rollup globals. */
const rollupAspEntryPoints = aspSecondaryEntryPoints
  .reduce((globals: any, entryPoint: string) => {
    globals[`@${buildConfig.namespace}/aspnetcore-engine/${entryPoint}`] =
      `${buildConfig.namespace}.aspnetcoreEngine.${dashCaseToCamelCase(entryPoint)}`;
    return globals;
  }, {});

/** List of potential secondary entry-points for the express engine package. */
const expressSecondaryEntryPoints = getSubdirectoryNames(join(buildConfig.packagesDir,
  'express-engine'));

/** Object with all express engine entry points in the format of Rollup globals. */
const rollupExpressEntryPoints = expressSecondaryEntryPoints
  .reduce((globals: any, entryPoint: string) => {
    globals[`@${buildConfig.namespace}/express-engine/${entryPoint}`] =
      `${buildConfig.namespace}.expressEngine.${dashCaseToCamelCase(entryPoint)}`;
    return globals;
  }, {});

/** List of potential secondary entry-points for the hapi engine package. */
const hapiSecondaryEntryPoints = getSubdirectoryNames(join(buildConfig.packagesDir,
  'hapi-engine'));

/** Object with all hapi engine entry points in the format of Rollup globals. */
const rollupHapiEntryPoints = hapiSecondaryEntryPoints
  .reduce((globals: any, entryPoint: string) => {
    globals[`@${buildConfig.namespace}/hapi-engine/${entryPoint}`] =
      `${buildConfig.namespace}.hapiEngine.${dashCaseToCamelCase(entryPoint)}`;
    return globals;
  }, {});

/** List of potential secondary entry-points for the hapi engine package. */
const moduleMapSecondaryEntryPoints = getSubdirectoryNames(join(buildConfig.packagesDir,
  'module-map-ngfactory-loader'));

/** Object with all hapi engine entry points in the format of Rollup globals. */
const rollupModuleMapEntryPoints = moduleMapSecondaryEntryPoints
  .reduce((globals: any, entryPoint: string) => {
    globals[`@${buildConfig.namespace}/module-map-ngfactory-loader/${entryPoint}`] =
      `${buildConfig.namespace}.moduleMapNgfactoryLoader.${dashCaseToCamelCase(entryPoint)}`;
    return globals;
  }, {});

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
  'hapi': 'hapi',

  '@nguniversal/aspnetcore-engine': 'nguniversal.aspnetcoreEngine',
  '@nguniversal/common': 'nguniversal.common',
  '@nguniversal/express-engine': 'nguniversal.expressEngine',
  '@nguniversal/hapi-engine': 'nguniversal.hapiEngine',
  '@nguniversal/module-map-ngfactory-loader': 'nguniversal.moduleMapNgfactoryLoader',

  ...rollupAspEntryPoints,
  ...rollupCommonEntryPoints,
  ...rollupExpressEntryPoints,
  ...rollupHapiEntryPoints,
  ...rollupModuleMapEntryPoints,
};
