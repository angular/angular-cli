/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type JsonObject, type JsonValue, isJsonObject } from '@angular-devkit/core';
import { type Rule, type SchematicContext, type Tree, chain } from '@angular-devkit/schematics';
import { dirname, join, normalize, relative } from 'node:path/posix';
import {
  DependencyType,
  ExistingBehavior,
  addDependency,
  removeDependency,
} from '../../utility/dependency';
import { JSONFile } from '../../utility/json-file';
import { latestVersions } from '../../utility/latest-versions';
import {
  type TargetDefinition,
  allTargetOptions,
  allWorkspaceTargets,
  updateWorkspace,
} from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

/**
 * Represents the configuration structure of an `ng-package.json` file or
 * the `ngPackage` section within a `package.json` file.
 */
interface NgPackageConfig {
  dest?: string;
  assets?: (string | { glob: string; input: string; output: string })[];
  allowedNonPeerDependencies?: string[];
  inlineStyleLanguage?: string;
  keepLifecycleScripts?: boolean;
  deleteDestPath?: boolean;
  lib?: {
    entryFile?: string;
    styleIncludePaths?: string[];
    sass?: {
      fatalDeprecations?: string[];
      silenceDeprecations?: string[];
      futureDeprecations?: string[];
    };
  };
}

/**
 * Metadata describing a discovered secondary entry point in a library project.
 */
interface SecondaryEntryPoint {
  subpath: string;
  entryPoint: string;
  configFile: string;
}

/**
 * Normalizes a workspace-relative POSIX path, converting `'.'` or `'/'` to `''`.
 *
 * @param path The path string to normalize.
 * @returns The normalized workspace-relative path.
 */
function normalizeRelativePath(path: string): string {
  const normalized = normalize(path).replace(/^\/+|\/+$/g, '');

  return normalized === '.' ? '' : normalized;
}

/**
 * Reads and parses an `ng-packagr` configuration from either an `ng-package.json`
 * file or the `ngPackage` property of a `package.json` file.
 *
 * @param tree The virtual file system tree.
 * @param filePath The workspace-relative path to the configuration file.
 * @returns The parsed `NgPackageConfig`, or `undefined` if the file does not exist or cannot be parsed.
 */
function parseNgPackageFile(tree: Tree, filePath: string): NgPackageConfig | undefined {
  if (!tree.exists(filePath)) {
    return undefined;
  }

  try {
    const json = new JSONFile(tree, filePath);
    if (filePath.endsWith('/package.json') || filePath === 'package.json') {
      const ngPackage = json.get(['ngPackage']) as JsonValue;

      return isJsonObject(ngPackage) ? (ngPackage as NgPackageConfig) : undefined;
    }

    const content = json.get([]) as JsonValue;

    return isJsonObject(content) ? (content as NgPackageConfig) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolves the TypeScript entry file path for a library entry point directory.
 * Uses the explicitly configured `entryFile` when provided, or checks common
 * default locations before falling back to `'src/public-api.ts'`.
 *
 * @param tree The virtual file system tree.
 * @param dir The directory of the primary or secondary entry point.
 * @param configuredEntry The optional `lib.entryFile` path from `ng-package.json`.
 * @returns The resolved entry file path relative to `dir`.
 */
function resolveEntryFile(tree: Tree, dir: string, configuredEntry?: string): string {
  if (configuredEntry) {
    return configuredEntry;
  }

  const candidates = [
    'src/public-api.ts',
    'src/public_api.ts',
    'public-api.ts',
    'public_api.ts',
    'src/index.ts',
    'index.ts',
  ];

  for (const candidate of candidates) {
    if (tree.exists(join(dir, candidate))) {
      return candidate;
    }
  }

  return 'src/public-api.ts';
}

/**
 * Traverses a library project directory to discover all secondary entry points
 * defined by nested `ng-package.json` files or `package.json` files containing an `ngPackage` field.
 *
 * @param tree The virtual file system tree.
 * @param projectRoot The root directory of the library project.
 * @param primaryProjectFile The workspace-relative path to the primary `ng-packagr` configuration file.
 * @returns An array of discovered secondary entry points.
 */
function findSecondaryEntryPoints(
  tree: Tree,
  projectRoot: string,
  primaryProjectFile: string,
): SecondaryEntryPoint[] {
  const secondaryEntryPoints: SecondaryEntryPoint[] = [];
  const normalizedRoot = normalizeRelativePath(projectRoot);
  const normalizedPrimary = primaryProjectFile ? normalizeRelativePath(primaryProjectFile) : '';
  const rootDir = tree.getDir(normalizedRoot);
  const directories = [rootDir];

  while (directories.length > 0) {
    const current = directories.shift();
    if (!current) {
      break;
    }

    const currentPath = normalizeRelativePath(current.path);

    if (currentPath !== normalizedRoot) {
      const ngPackageJsonPath = join(currentPath, 'ng-package.json');
      const packageJsonPath = join(currentPath, 'package.json');

      if (
        current.subfiles.some((f) => f === 'ng-package.json') &&
        ngPackageJsonPath !== normalizedPrimary
      ) {
        const config = parseNgPackageFile(tree, ngPackageJsonPath);
        const subpath = relative(normalizedRoot, currentPath);
        const entryFile = resolveEntryFile(tree, currentPath, config?.lib?.entryFile);
        secondaryEntryPoints.push({
          subpath,
          entryPoint: join(currentPath, entryFile),
          configFile: ngPackageJsonPath,
        });
      } else if (
        current.subfiles.some((f) => f === 'package.json') &&
        packageJsonPath !== normalizedPrimary
      ) {
        const config = parseNgPackageFile(tree, packageJsonPath);
        if (config) {
          const subpath = relative(normalizedRoot, currentPath);
          const entryFile = resolveEntryFile(tree, currentPath, config.lib?.entryFile);
          secondaryEntryPoints.push({
            subpath,
            entryPoint: join(currentPath, entryFile),
            configFile: packageJsonPath,
          });
        }
      }
    }

    for (const subdir of current.subdirs) {
      if (
        subdir === 'node_modules' ||
        subdir === 'dist' ||
        subdir === 'out-tsc' ||
        subdir.startsWith('.')
      ) {
        continue;
      }
      directories.push(current.dir(subdir));
    }
  }

  return secondaryEntryPoints;
}

/**
 * Transfers `ng-packagr` configuration options onto the library's `build` target in `angular.json`.
 *
 * @param projectRoot The normalized root directory of the library project.
 * @param projectDir The directory containing the primary `ng-packagr` configuration file.
 * @param buildTarget The library's `build` target definition in `angular.json`.
 * @param ngPackageConfig The parsed `NgPackageConfig`, if available.
 * @param tree The virtual file system tree.
 */
function migrateTargetOptions(
  projectRoot: string,
  projectDir: string,
  buildTarget: TargetDefinition,
  ngPackageConfig: NgPackageConfig | undefined,
  tree: Tree,
): void {
  buildTarget.builder = Builders.BuildLibrary;
  buildTarget.options ??= {};

  const devTsConfig = buildTarget.configurations?.['development']?.['tsConfig'];
  if (typeof buildTarget.options['tsConfig'] !== 'string') {
    if (typeof devTsConfig === 'string') {
      buildTarget.options['tsConfig'] = devTsConfig;
      delete buildTarget.configurations?.['development']?.['tsConfig'];
    } else if (tree.exists(join(projectRoot, 'tsconfig.lib.json'))) {
      buildTarget.options['tsConfig'] = join(projectRoot, 'tsconfig.lib.json');
    }
  } else if (devTsConfig === buildTarget.options['tsConfig']) {
    delete buildTarget.configurations?.['development']?.['tsConfig'];
  }

  if (ngPackageConfig?.dest && typeof buildTarget.options['outputPath'] !== 'string') {
    buildTarget.options['outputPath'] = join(projectDir, ngPackageConfig.dest);
  }

  if (ngPackageConfig?.assets?.length) {
    const existingAssets = Array.isArray(buildTarget.options['assets'])
      ? buildTarget.options['assets']
      : [];
    const migratedAssets = ngPackageConfig.assets.map((asset) => {
      if (typeof asset === 'string') {
        return join(projectDir, asset);
      }
      if (isJsonObject(asset) && typeof asset['input'] === 'string') {
        return {
          ...asset,
          input: join(projectDir, asset['input']),
        };
      }

      return asset;
    });
    buildTarget.options['assets'] = [...existingAssets, ...migratedAssets];
  }

  if (ngPackageConfig?.lib?.styleIncludePaths?.length || ngPackageConfig?.lib?.sass) {
    const stylePreprocessorOptions = buildTarget.options['stylePreprocessorOptions'];
    const existingPreprocessorOptions: JsonObject =
      stylePreprocessorOptions && isJsonObject(stylePreprocessorOptions)
        ? { ...stylePreprocessorOptions }
        : {};

    if (ngPackageConfig.lib.styleIncludePaths?.length) {
      existingPreprocessorOptions['includePaths'] = ngPackageConfig.lib.styleIncludePaths.map((p) =>
        join(projectDir, p),
      );
    }
    if (ngPackageConfig.lib.sass) {
      existingPreprocessorOptions['sass'] = ngPackageConfig.lib.sass;
    }

    buildTarget.options['stylePreprocessorOptions'] = existingPreprocessorOptions;
  }

  if (ngPackageConfig?.allowedNonPeerDependencies?.length) {
    buildTarget.options['allowedNonPeerDependencies'] = ngPackageConfig.allowedNonPeerDependencies;
  }
  if (ngPackageConfig?.inlineStyleLanguage) {
    buildTarget.options['inlineStyleLanguage'] = ngPackageConfig.inlineStyleLanguage;
  }
  if (ngPackageConfig?.keepLifecycleScripts !== undefined) {
    buildTarget.options['keepLifecycleScripts'] = ngPackageConfig.keepLifecycleScripts;
  }
  if (ngPackageConfig?.deleteDestPath !== undefined) {
    buildTarget.options['deleteOutputPath'] = ngPackageConfig.deleteDestPath;
  }

  for (const [, options] of allTargetOptions(buildTarget, false)) {
    delete options['project'];
  }

  // Configure development configuration with full compilation mode and declaration maps
  buildTarget.configurations ??= {};
  buildTarget.configurations['development'] ??= {};
  buildTarget.configurations['development']['compilationMode'] = 'full';
  buildTarget.configurations['development']['declarationMap'] = true;
}

/**
 * Migrates a single library project's `build` target from `ng-packagr` to `@angular/build:library`,
 * transferring configuration options to `angular.json`, writing entry points to `package.json#exports`,
 * and cleaning up obsolete `ng-packagr` configuration files.
 *
 * @param projectRoot The root directory of the library project.
 * @param buildTarget The library's `build` target definition in `angular.json`.
 * @param tree The virtual file system tree.
 * @param context The schematic execution context.
 * @returns `true` if the library target was migrated, or `false` if it was skipped.
 */
function updateLibraryTarget(
  projectRoot: string,
  buildTarget: TargetDefinition,
  tree: Tree,
  context: SchematicContext,
): boolean {
  const normalizedProjectRoot = normalizeRelativePath(projectRoot);
  let primaryProjectFile =
    typeof buildTarget.options?.['project'] === 'string'
      ? normalizeRelativePath(buildTarget.options['project'])
      : '';
  if (!primaryProjectFile) {
    for (const [, options] of allTargetOptions(buildTarget, true)) {
      if (typeof options['project'] === 'string') {
        primaryProjectFile = normalizeRelativePath(options['project']);
        break;
      }
    }
  }
  if (!primaryProjectFile) {
    const defaultNgPackageJson = join(normalizedProjectRoot, 'ng-package.json');
    const defaultPackageJson = join(normalizedProjectRoot, 'package.json');
    if (tree.exists(defaultNgPackageJson)) {
      primaryProjectFile = defaultNgPackageJson;
    } else if (tree.exists(defaultPackageJson)) {
      primaryProjectFile = defaultPackageJson;
    }
  }

  if (/\.[cm]?js$/.test(primaryProjectFile)) {
    context.logger.warn(
      `Skipping project at "${projectRoot}" because JavaScript ng-packagr ` +
        `configuration files ("${primaryProjectFile}") cannot be automatically migrated.`,
    );

    return false;
  }

  const ngPackageConfig = primaryProjectFile
    ? parseNgPackageFile(tree, primaryProjectFile)
    : undefined;

  const projectDir = primaryProjectFile
    ? normalizeRelativePath(dirname(primaryProjectFile))
    : normalizedProjectRoot;
  const primaryEntryFile = resolveEntryFile(tree, projectDir, ngPackageConfig?.lib?.entryFile);
  const primaryEntryFilePath = join(projectDir, primaryEntryFile);
  const secondaryEntryPoints = findSecondaryEntryPoints(
    tree,
    normalizedProjectRoot,
    primaryProjectFile,
  );

  const toRelativeExportPath = (filePath: string): string => {
    const rel = relative(normalizedProjectRoot, filePath);

    return rel.startsWith('./') || rel.startsWith('../') ? rel : `./${rel}`;
  };

  const entryPointExports: Record<string, string> = {
    '.': toRelativeExportPath(primaryEntryFilePath),
  };
  for (const secondary of secondaryEntryPoints) {
    const exportKey =
      secondary.subpath.startsWith('./') || secondary.subpath.startsWith('../')
        ? secondary.subpath
        : `./${secondary.subpath}`;
    entryPointExports[exportKey] = toRelativeExportPath(secondary.entryPoint);
  }

  migrateTargetOptions(normalizedProjectRoot, projectDir, buildTarget, ngPackageConfig, tree);

  const packageJsonPath = join(normalizedProjectRoot, 'package.json');

  // Delete primary ng-package.json if it exists
  if (
    primaryProjectFile &&
    primaryProjectFile.endsWith('ng-package.json') &&
    tree.exists(primaryProjectFile)
  ) {
    tree.delete(primaryProjectFile);
  } else if (
    primaryProjectFile &&
    primaryProjectFile !== packageJsonPath &&
    (primaryProjectFile.endsWith('/package.json') || primaryProjectFile === 'package.json') &&
    tree.exists(primaryProjectFile)
  ) {
    const json = new JSONFile(tree, primaryProjectFile);
    json.remove(['ngPackage']);
  }

  // Update library package.json with exports and remove ngPackage
  if (tree.exists(packageJsonPath)) {
    updateLibraryPackageJson(tree, packageJsonPath, entryPointExports);
  }

  // Delete secondary configuration files
  for (const secondary of secondaryEntryPoints) {
    if (secondary.configFile.endsWith('ng-package.json') && tree.exists(secondary.configFile)) {
      tree.delete(secondary.configFile);
    } else if (
      (secondary.configFile.endsWith('/package.json') || secondary.configFile === 'package.json') &&
      tree.exists(secondary.configFile)
    ) {
      const json = new JSONFile(tree, secondary.configFile);
      json.remove(['ngPackage']);
      const remaining = json.get([]) as JsonValue;
      if (
        isJsonObject(remaining) &&
        Object.keys(remaining).filter((k) => k !== '$schema').length === 0
      ) {
        tree.delete(secondary.configFile);
      }
    }
  }

  context.logger.info(
    `Updated project at "${projectRoot}" to use the new '@angular/build:library' builder with ${
      Object.keys(entryPointExports).length
    } entry point(s).`,
  );

  return true;
}

/**
 * Updates the library's `package.json` file by removing the legacy `ngPackage` configuration
 * and `tslib` dependency, and merging the discovered entry points into the `exports` map.
 *
 * @param tree The virtual file system tree.
 * @param packageJsonPath The workspace-relative path to the library's `package.json`.
 * @param entryPointExports Map of export subpaths to relative entry file paths.
 */
function updateLibraryPackageJson(
  tree: Tree,
  packageJsonPath: string,
  entryPointExports: Record<string, string>,
): void {
  const json = new JSONFile(tree, packageJsonPath);
  json.remove(['ngPackage']);

  for (const depType of [
    'dependencies',
    'peerDependencies',
    'devDependencies',
    'optionalDependencies',
  ]) {
    json.remove([depType, 'tslib']);
    const deps = json.get([depType]) as JsonValue;
    if (isJsonObject(deps) && Object.keys(deps).length === 0) {
      json.remove([depType]);
    }
  }

  const existingExports = json.get(['exports']) as JsonValue;
  let existingExportsObj: Record<string, JsonValue> = {};
  if (isJsonObject(existingExports)) {
    const keys = Object.keys(existingExports);
    if (keys.some((k) => k.startsWith('.'))) {
      existingExportsObj = existingExports;
    } else if (keys.length > 0) {
      existingExportsObj = { '.': existingExports };
    }
  }

  const updatedExports: Record<string, JsonValue> = {
    ...existingExportsObj,
  };

  for (const [subpath, targetPath] of Object.entries(entryPointExports)) {
    const current = updatedExports[subpath];
    if (current && isJsonObject(current)) {
      updatedExports[subpath] = {
        ...current,
        default: targetPath,
      };
    } else {
      updatedExports[subpath] = targetPath;
    }
  }

  json.modify(['exports'], updatedExports);
}

/**
 * Migration main entrypoint for use-library-builder.
 */
export default function (): Rule {
  return (tree, context) =>
    updateWorkspace((workspace) => {
      let hasMigratedLibrary = false;

      for (const [, project] of workspace.projects) {
        if (project.extensions.projectType !== ProjectType.Library) {
          continue;
        }

        const buildTarget = project.targets.get('build');
        if (
          !buildTarget ||
          buildTarget.builder === Builders.BuildLibrary ||
          (buildTarget.builder !== Builders.NgPackagr &&
            buildTarget.builder !== Builders.BuildNgPackagr)
        ) {
          continue;
        }

        if (updateLibraryTarget(project.root, buildTarget, tree, context)) {
          hasMigratedLibrary = true;
        }
      }

      if (!hasMigratedLibrary) {
        return;
      }

      const rules: Rule[] = [
        addDependency('@angular/build', latestVersions.AngularBuild, {
          type: DependencyType.Dev,
          existing: ExistingBehavior.Skip,
        }),
      ];

      // Check if any targets still use ng-packagr across the workspace
      let hasNgPackagrUsage = false;
      for (const [, target] of allWorkspaceTargets(workspace)) {
        if (target.builder === Builders.NgPackagr || target.builder === Builders.BuildNgPackagr) {
          hasNgPackagrUsage = true;
          break;
        }
      }

      if (!hasNgPackagrUsage) {
        rules.push(removeDependency('ng-packagr'));
      }

      return chain(rules);
    });
}
