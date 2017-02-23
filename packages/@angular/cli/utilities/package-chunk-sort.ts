import { ExtraEntry, extraEntryParser } from '../models/webpack-configs/utils';

// Sort chunks according to a predefined order:
// inline, polyfills, all scripts, all styles, vendor, main
export function packageChunkSort(appConfig: any) {
  let entryPoints = ['inline', 'polyfills', 'sw-register'];

  const pushExtraEntries = (extraEntry: ExtraEntry) => {
    if (entryPoints.indexOf(extraEntry.entry) === -1) {
      entryPoints.push(extraEntry.entry);
    }
  };

  if (appConfig.scripts) {
    extraEntryParser(appConfig.scripts, './', 'scripts').forEach(pushExtraEntries);
  }

  if (appConfig.styles) {
    extraEntryParser(appConfig.styles, './', 'styles').forEach(pushExtraEntries);
  }

  entryPoints.push(...['vendor', 'main']);

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
