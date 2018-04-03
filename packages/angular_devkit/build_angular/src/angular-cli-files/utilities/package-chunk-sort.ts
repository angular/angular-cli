// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import { ExtraEntryPoint } from '../../browser';

export function generateEntryPoints(appConfig: any) {
  let entryPoints = ['polyfills', 'sw-register'];

  // Add all styles/scripts, except lazy-loaded ones.
  [
    ...(appConfig.styles as ExtraEntryPoint[])
      .filter(entry => !entry.lazy)
      .map(entry => entry.bundleName || 'styles'),
    ...(appConfig.scripts as ExtraEntryPoint[])
      .filter(entry => !entry.lazy)
      .map(entry => entry.bundleName || 'scripts'),
  ].forEach(bundleName => {
    if (entryPoints.indexOf(bundleName) === -1) {
      entryPoints.push(bundleName);
    }
  });

  entryPoints.push('main');

  return entryPoints;
}

// Sort chunks according to a predefined order:
// inline, polyfills, all styles, vendor, main
export function packageChunkSort(appConfig: any) {
  const entryPoints = generateEntryPoints(appConfig);

  function sort(left: any, right: any) {
    let leftIndex = entryPoints.indexOf(left.names[0]);
    let rightindex = entryPoints.indexOf(right.names[0]);

    if (leftIndex > rightindex) {
      return 1;
    } else if (leftIndex < rightindex) {
      return -1;
    } else {
      return 0;
    }
  }

  // We need to list of entry points for the Ejected webpack config to work (we reuse the function
  // defined above).
  (sort as any).entryPoints = entryPoints;
  return sort;
}
