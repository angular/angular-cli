/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * This loader is needed to add additional exports and is a workaround for a Webpack bug that doesn't
 * allow exports from multiple files in the same entry.
 * @see https://github.com/webpack/webpack/issues/15936.
 */
export default function (
  this: import('webpack').LoaderContext<{
    angularSSRInstalled: boolean;
    isZoneJsInstalled: boolean;
  }>,
  content: string,
  map: Parameters<import('webpack').LoaderDefinitionFunction>[1],
) {
  const { angularSSRInstalled, isZoneJsInstalled } = this.getOptions();

  let source = `${content}

  // EXPORTS added by @angular-devkit/build-angular
  export { renderApplication, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';
  `;

  if (angularSSRInstalled) {
    source += `
      export { ɵgetRoutesFromAngularRouterConfig } from '@angular/ssr';
    `;
  }

  if (isZoneJsInstalled) {
    source = `import 'zone.js/node';
    ${source}`;
  }

  this.callback(null, source, map);

  return;
}
