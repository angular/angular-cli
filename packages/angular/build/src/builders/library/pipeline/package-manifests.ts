/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import type { NormalizedLibraryOptions, PackageJsonData } from '../options';
import {
  FESM_OUTPUT_DIR,
  type MemoryOutputFile,
  TYPES_OUTPUT_DIR,
  createMemoryOutputFile,
} from './utils';

/**
 * Generates the APF package.json and secondary entry point package.json manifests.
 *
 * @param options The normalized library options.
 * @param isWatchMode Whether the builder is running in watch mode.
 * @returns An array of memory output files containing generated package manifests and .npmignore.
 */
export function generatePackageManifests(
  options: NormalizedLibraryOptions,
  isWatchMode: boolean,
): MemoryOutputFile[] {
  const { packageJson: rawPackageJson, keepLifecycleScripts, compilationMode } = options;

  const {
    devDependencies: _devDependencies,
    scripts,
    name,
    version,
    exports: userExports,
    workspaces: _workspaces,
    ...restPackageJson
  } = rawPackageJson;

  const exportsMap: Record<string, unknown> = {
    ...(typeof userExports === 'object' && userExports !== null && !Array.isArray(userExports)
      ? userExports
      : {}),
    './package.json': { default: './package.json' },
  };

  const primaryEntryPoint = options.entryPoints.get('.');
  if (!primaryEntryPoint) {
    throw new Error(`Primary entry point '.' was not found in entryPoints.`);
  }

  const primaryName = primaryEntryPoint.bundleName;

  // Configure primary entry point
  const primaryFesm = `./${FESM_OUTPUT_DIR}/${primaryName}.mjs`;
  const primaryDts = `./${TYPES_OUTPUT_DIR}/${primaryName}.d.ts`;

  exportsMap['.'] = createExportConditions(exportsMap['.'], primaryDts, primaryFesm);

  const distPackageJson: PackageJsonData = {
    ...restPackageJson,
    name,
    type: 'module',
    sideEffects: rawPackageJson.sideEffects ?? false,
    main: primaryFesm,
    module: primaryFesm,
    typings: primaryDts,
    types: primaryDts,
    exports: exportsMap,
    // Needed because of Webpack's 5 `cachemanagedpaths`
    // https://github.com/angular/angular-cli/issues/20962
    version: isWatchMode ? `0.0.0-watch+${Date.now()}` : version,
  };

  // Retain scripts if keepLifecycleScripts is set
  if (keepLifecycleScripts && scripts) {
    distPackageJson.scripts = scripts;
  }

  // Prevent accidental publishing of non-partial compilation packages (APF requirement)
  if (compilationMode !== 'partial') {
    distPackageJson.scripts = {
      ...distPackageJson.scripts,
      prepublishOnly:
        'node --eval "' +
        "console.error('ERROR: Trying to publish a package that has been compiled in full compilation mode. " +
        'This is not allowed by the Angular Package Format. ' +
        "Please rebuild with compilationMode set to \\'partial\\' before publishing.'); " +
        'process.exit(1)"',
    };
  }

  // Configure secondary entry points
  const nestedPackageJsonDirs: string[] = [];
  const filesToEmit: MemoryOutputFile[] = [];

  for (const entryPoint of options.entryPoints.values()) {
    if (entryPoint.isPrimary) {
      continue;
    }

    const { subpath, name: epSubpathName, bundleName: epName } = entryPoint;
    const epFesm = `./${FESM_OUTPUT_DIR}/${epName}.mjs`;
    const epDts = `./${TYPES_OUTPUT_DIR}/${epName}.d.ts`;

    exportsMap[subpath] = createExportConditions(exportsMap[subpath], epDts, epFesm);

    // Emit secondary package.json for legacy resolution tools
    nestedPackageJsonDirs.push(epSubpathName);

    const relFesm = path.posix.relative(epSubpathName, epFesm);
    const relDts = path.posix.relative(epSubpathName, epDts);
    const secondaryModule = relFesm[0] === '.' ? relFesm : `./${relFesm}`;
    const secondaryTypings = relDts[0] === '.' ? relDts : `./${relDts}`;

    const secondaryPackageJson = {
      module: secondaryModule,
      typings: secondaryTypings,
      types: secondaryTypings,
    };

    filesToEmit.push(
      createMemoryOutputFile(path.posix.join(epSubpathName, 'package.json'), secondaryPackageJson),
    );
  }

  // Write .npmignore to prevent publishing nested secondary package.json files
  if (nestedPackageJsonDirs.length > 0) {
    const entryPointsJsonPaths = nestedPackageJsonDirs.map((d) => `/${d}/package.json`);

    filesToEmit.push(
      createMemoryOutputFile(
        '.npmignore',
        `# Nested package.json's are only needed for development.\n${entryPointsJsonPaths.join('\n')}`,
      ),
    );
  }

  // create root package.json
  filesToEmit.push(createMemoryOutputFile('package.json', distPackageJson));

  return filesToEmit;
}

/**
 * Creates or updates export conditions for an entry point, preserving custom user-defined conditions.
 */
function createExportConditions(
  existingConditions: unknown,
  dtsPath: string,
  fesmPath: string,
): Record<string, unknown> {
  const existing =
    typeof existingConditions === 'object' &&
    existingConditions !== null &&
    !Array.isArray(existingConditions)
      ? (existingConditions as Record<string, unknown>)
      : {};

  const { types: _types, default: _default, ...otherConditions } = existing;

  return {
    types: dtsPath,
    ...otherConditions,
    default: fesmPath,
  };
}
