/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { DirEntry, Tree } from '@angular-devkit/schematics';
import { basename, dirname, extname, join } from 'node:path/posix';
import { TargetDefinition, WorkspaceDefinition } from '../../utility/workspace';
import { findImports } from './css-import-lexer';

/** A list of all supported SASS style extensions.
 * Order of extension is important and matches Sass behavior.
 */
const SASS_EXTENSIONS = ['.scss', '.sass', '.css'];

/** The prefix used to indicate a SASS partial file. */
const SASS_PARTIAL_PREFIX = '_';

/**
 * An object containing the results of analyzing a single stylesheet file.
 */
interface StylesheetAnalysis {
  /** Whether the stylesheet requires the workspace root to be added to the SASS include paths. */
  needsWorkspaceIncludePath: boolean;

  /** A set of external dependencies that were discovered in the stylesheet. */
  externalDependencies: Set<string>;

  /** A list of content changes that need to be applied to the stylesheet. */
  contentChanges: { start: number; length: number }[];
}

/**
 * Searches the schematic tree for files that have a `.less` extension.
 * This is used to determine if the `less` package should be added as a dependency.
 *
 * @param tree A Schematics tree instance to search.
 * @returns `true` if Less stylesheet files are found; otherwise, `false`.
 */
export function hasLessStylesheets(tree: Tree): boolean {
  const directories = [tree.getDir('/')];

  let current;
  while ((current = directories.pop())) {
    for (const path of current.subfiles) {
      if (path.endsWith('.less')) {
        return true;
      }
    }

    for (const path of current.subdirs) {
      if (path === 'node_modules' || path.startsWith('.')) {
        continue;
      }
      directories.push(current.dir(path));
    }
  }

  return false;
}

/**
 * Searches for a PostCSS configuration file within the workspace root or any of the project roots.
 * This is used to determine if the `postcss` package should be added as a dependency.
 *
 * @param tree A Schematics tree instance to search.
 * @param workspace A Workspace to check for projects.
 * @returns `true` if a PostCSS configuration file is found; otherwise, `false`.
 */
export function hasPostcssConfiguration(tree: Tree, workspace: WorkspaceDefinition): boolean {
  const projectRoots = [...workspace.projects.values()].map((p) => p.root).filter(Boolean);
  const searchDirectories = new Set(['', ...projectRoots]);

  for (const dir of searchDirectories) {
    if (
      tree.exists(join(dir, 'postcss.config.json')) ||
      tree.exists(join(dir, '.postcssrc.json'))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively visits all stylesheet files in a directory and yields their path and content.
 *
 * @param directory The directory to visit.
 */
function* visitStylesheets(directory: DirEntry): IterableIterator<[path: string, content: string]> {
  for (const path of directory.subfiles) {
    if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.sass')) {
      const entry = directory.file(path);
      if (entry) {
        yield [entry.path, entry.content.toString()];
      }
    }
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules' || path.startsWith('.')) {
      continue;
    }

    yield* visitStylesheets(directory.dir(path));
  }
}

/**
 * Determines if a Sass import is likely intended to be relative to the workspace root.
 * This is considered true if the import cannot be resolved relative to the containing file,
 * but can be resolved relative to the workspace root.
 *
 * @param specifier The import specifier to check.
 * @param filePath The path of the file containing the import.
 * @param tree A Schematics tree instance.
 * @param fromImport Whether the specifier is from an `@import` rule.
 * @returns `true` if the import is likely workspace-relative; otherwise, `false`.
 */
function isWorkspaceRelativeSassImport(
  specifier: string,
  filePath: string,
  tree: Tree,
  fromImport: boolean,
): boolean {
  const relativeBase = dirname(filePath);
  const potentialWorkspacePaths = [...potentialSassImports(specifier, '/', fromImport)];

  if (potentialWorkspacePaths.some((p) => tree.exists(p))) {
    const potentialRelativePaths = [...potentialSassImports(specifier, relativeBase, fromImport)];

    return potentialRelativePaths.every((p) => !tree.exists(p));
  }

  return false;
}

/**
 * Analyzes a single stylesheet's content for import patterns that need to be updated.
 *
 * @param filePath The path of the stylesheet file.
 * @param content The content of the stylesheet file.
 * @param tree A Schematics tree instance.
 * @returns A `StylesheetAnalysis` object containing the results of the analysis.
 */
function analyzeStylesheet(filePath: string, content: string, tree: Tree): StylesheetAnalysis {
  const isSass = filePath.endsWith('.scss') || filePath.endsWith('.sass');
  const analysis: StylesheetAnalysis = {
    needsWorkspaceIncludePath: false,
    externalDependencies: new Set<string>(),
    contentChanges: [],
  };

  for (const { start, specifier, fromUse } of findImports(content, isSass)) {
    if (specifier.startsWith('~')) {
      analysis.contentChanges.push({ start: start + 1, length: 1 });
    } else if (specifier.startsWith('^')) {
      analysis.contentChanges.push({ start: start + 1, length: 1 });
      analysis.externalDependencies.add(specifier.slice(1));
    } else if (isSass && isWorkspaceRelativeSassImport(specifier, filePath, tree, !fromUse)) {
      analysis.needsWorkspaceIncludePath = true;
    }
  }

  return analysis;
}

/**
 * The main orchestrator function for updating stylesheets.
 * It iterates through all stylesheets in a project, analyzes them, and applies the necessary
 * changes to the files and the build configuration.
 *
 * @param tree A Schematics tree instance.
 * @param projectSourceRoot The source root of the project being updated.
 * @param buildTarget The build target of the project being updated.
 */
export function updateStyleImports(
  tree: Tree,
  projectSourceRoot: string,
  buildTarget: TargetDefinition,
): void {
  const allExternalDeps = new Set<string>();
  let projectNeedsIncludePath = false;

  for (const [path, content] of visitStylesheets(tree.getDir(projectSourceRoot))) {
    const { needsWorkspaceIncludePath, externalDependencies, contentChanges } = analyzeStylesheet(
      path,
      content,
      tree,
    );

    if (needsWorkspaceIncludePath) {
      projectNeedsIncludePath = true;
    }

    for (const dep of externalDependencies) {
      allExternalDeps.add(dep);
    }

    if (contentChanges.length > 0) {
      const updater = tree.beginUpdate(path);
      // Apply changes in reverse to avoid index shifting
      for (const change of contentChanges.sort((a, b) => b.start - a.start)) {
        updater.remove(change.start, change.length);
      }
      tree.commitUpdate(updater);
    }
  }

  if (projectNeedsIncludePath) {
    buildTarget.options ??= {};
    const styleOptions = (buildTarget.options['stylePreprocessorOptions'] ??= {});
    const includePaths = ((styleOptions as { includePaths?: string[] })['includePaths'] ??= []);
    if (Array.isArray(includePaths)) {
      includePaths.push('.');
    }
  }

  if (allExternalDeps.size > 0) {
    buildTarget.options ??= {};
    const externalDeps = ((buildTarget.options['externalDependencies'] as string[] | undefined) ??=
      []);
    if (Array.isArray(externalDeps)) {
      externalDeps.push(...allExternalDeps);
    }
  }
}

/**
 * A helper generator that yields potential Sass import candidates for a given filename and extensions.
 *
 * @param directory The directory in which to resolve the candidates.
 * @param filename The base filename of the import.
 * @param extensions The file extensions to try.
 * @param fromImport Whether the specifier is from an `@import` rule.
 * @returns An iterable of potential import file paths.
 */
function* yieldSassImportCandidates(
  directory: string,
  filename: string,
  extensions: readonly string[],
  fromImport: boolean,
): Iterable<string> {
  if (fromImport) {
    for (const ext of extensions) {
      yield join(directory, filename + '.import' + ext);
      yield join(directory, SASS_PARTIAL_PREFIX + filename + '.import' + ext);
    }
  }
  for (const ext of extensions) {
    yield join(directory, filename + ext);
    yield join(directory, SASS_PARTIAL_PREFIX + filename + ext);
  }
}

/**
 * Generates a sequence of potential file paths that the Sass compiler would attempt to resolve
 * for a given import specifier, following the official Sass resolution algorithm.
 * Based on https://github.com/sass/dart-sass/blob/44d6bb6ac72fe6b93f5bfec371a1fffb18e6b76d/lib/src/importer/utils.dart
 *
 * @param specifier The import specifier to resolve.
 * @param base The base path from which to resolve the specifier.
 * @param fromImport Whether the specifier is from an `@import` rule.
 * @returns An iterable of potential file paths.
 */
function* potentialSassImports(
  specifier: string,
  base: string,
  fromImport: boolean,
): Iterable<string> {
  const directory = join(base, dirname(specifier));
  const extension = extname(specifier);
  const hasStyleExtension = SASS_EXTENSIONS.includes(extension);
  const filename = basename(specifier, hasStyleExtension ? extension : undefined);

  const extensionsToTry = hasStyleExtension ? [extension] : SASS_EXTENSIONS;
  yield* yieldSassImportCandidates(directory, filename, extensionsToTry, fromImport);
}
