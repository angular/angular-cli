/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ScriptElement, StyleElement } from '../builders/browser/schema';
import { normalizeExtraEntryPoints } from '../webpack/utils/helpers';

export type EntryPointsType = [name: string, isModule: boolean];

export function generateEntryPoints(options: {
  styles: StyleElement[];
  scripts: ScriptElement[];
  isHMREnabled?: boolean;
  scriptType?: false | 'text/javascript' | 'module';
}): EntryPointsType[] {
  // Add all styles/scripts, except lazy-loaded ones.
  const extraEntryPoints = (
    extraEntryPoints: (ScriptElement | ScriptElement)[],
    defaultBundleName: string,
  ) => {
    const entryPoints = normalizeExtraEntryPoints(extraEntryPoints, defaultBundleName)
      .filter((entry) => entry.inject)
      .map((entry) => entry.bundleName);

    // remove duplicates
    return [...new Set(entryPoints)].map<EntryPointsType>((f) => [f, false]);
  };

  const isModule = options.scriptType === 'module';

  const entryPoints: EntryPointsType[] = [
    ['runtime', isModule ? !options.isHMREnabled : false],
    ['polyfills', isModule],
    ...extraEntryPoints(options.styles, 'styles'),
    ...extraEntryPoints(options.scripts, 'scripts'),
    ['vendor', isModule],
    ['main', isModule],
  ];

  const duplicates = entryPoints.filter(
    ([name]) => entryPoints[0].indexOf(name) !== entryPoints[0].lastIndexOf(name),
  );

  if (duplicates.length > 0) {
    throw new Error(`Multiple bundles have been named the same: '${duplicates.join(`', '`)}'.`);
  }

  return entryPoints;
}
