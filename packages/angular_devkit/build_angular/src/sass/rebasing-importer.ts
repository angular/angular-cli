/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { RawSourceMap } from '@ampproject/remapping';
import MagicString from 'magic-string';
import { Dirent, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { FileImporter, Importer, ImporterResult, Syntax } from 'sass';

/**
 * A Regular expression used to find all `url()` functions within a stylesheet.
 * From packages/angular_devkit/build_angular/src/webpack/plugins/postcss-cli-resources.ts
 */
const URL_REGEXP = /url(?:\(\s*(['"]?))(.*?)(?:\1\s*\))/g;

/**
 * A Sass Importer base class that provides the load logic to rebase all `url()` functions
 * within a stylesheet. The rebasing will ensure that the URLs in the output of the Sass compiler
 * reflect the final filesystem location of the output CSS file.
 *
 * This class provides the core of the rebasing functionality. To ensure that each file is processed
 * by this importer's load implementation, the Sass compiler requires the importer's canonicalize
 * function to return a non-null value with the resolved location of the requested stylesheet.
 * Concrete implementations of this class must provide this canonicalize functionality for rebasing
 * to be effective.
 */
abstract class UrlRebasingImporter implements Importer<'sync'> {
  /**
   * @param entryDirectory The directory of the entry stylesheet that was passed to the Sass compiler.
   * @param rebaseSourceMaps When provided, rebased files will have an intermediate sourcemap added to the Map
   * which can be used to generate a final sourcemap that contains original sources.
   */
  constructor(
    private entryDirectory: string,
    private rebaseSourceMaps?: Map<string, RawSourceMap>,
  ) {}

  abstract canonicalize(url: string, options: { fromImport: boolean }): URL | null;

  load(canonicalUrl: URL): ImporterResult | null {
    const stylesheetPath = fileURLToPath(canonicalUrl);
    let contents = readFileSync(stylesheetPath, 'utf-8');

    // Rebase any URLs that are found
    if (contents.includes('url(')) {
      const stylesheetDirectory = dirname(stylesheetPath);

      let match;
      URL_REGEXP.lastIndex = 0;
      let updatedContents;
      while ((match = URL_REGEXP.exec(contents))) {
        const originalUrl = match[2];

        // If root-relative, absolute or protocol relative url, leave as-is
        if (/^((?:\w+:)?\/\/|data:|chrome:|#|\/)/.test(originalUrl)) {
          continue;
        }

        const rebasedPath = relative(this.entryDirectory, join(stylesheetDirectory, originalUrl));

        // Normalize path separators and escape characters
        // https://developer.mozilla.org/en-US/docs/Web/CSS/url#syntax
        const rebasedUrl = './' + rebasedPath.replace(/\\/g, '/').replace(/[()\s'"]/g, '\\$&');

        updatedContents ??= new MagicString(contents);
        updatedContents.update(match.index, match.index + match[0].length, `url(${rebasedUrl})`);
      }

      if (updatedContents) {
        contents = updatedContents.toString();
        if (this.rebaseSourceMaps) {
          // Generate an intermediate source map for the rebasing changes
          const map = updatedContents.generateMap({
            hires: true,
            includeContent: true,
            source: canonicalUrl.href,
          });
          this.rebaseSourceMaps.set(canonicalUrl.href, map as RawSourceMap);
        }
      }
    }

    let syntax: Syntax | undefined;
    switch (extname(stylesheetPath).toLowerCase()) {
      case 'css':
        syntax = 'css';
        break;
      case 'sass':
        syntax = 'indented';
        break;
      default:
        syntax = 'scss';
        break;
    }

    return {
      contents,
      syntax,
      sourceMapUrl: canonicalUrl,
    };
  }
}

/**
 * Provides the Sass importer logic to resolve relative stylesheet imports via both import and use rules
 * and also rebase any `url()` function usage within those stylesheets. The rebasing will ensure that
 * the URLs in the output of the Sass compiler reflect the final filesystem location of the output CSS file.
 */
export class RelativeUrlRebasingImporter extends UrlRebasingImporter {
  constructor(
    entryDirectory: string,
    private directoryCache = new Map<string, Dirent[]>(),
    rebaseSourceMaps?: Map<string, RawSourceMap>,
  ) {
    super(entryDirectory, rebaseSourceMaps);
  }

  canonicalize(url: string, options: { fromImport: boolean }): URL | null {
    return this.resolveImport(url, options.fromImport, true);
  }

  /**
   * Attempts to resolve a provided URL to a stylesheet file using the Sass compiler's resolution algorithm.
   * Based on https://github.com/sass/dart-sass/blob/44d6bb6ac72fe6b93f5bfec371a1fffb18e6b76d/lib/src/importer/utils.dart
   * @param url The file protocol URL to resolve.
   * @param fromImport If true, URL was from an import rule; otherwise from a use rule.
   * @param checkDirectory If true, try checking for a directory with the base name containing an index file.
   * @returns A full resolved URL of the stylesheet file or `null` if not found.
   */
  private resolveImport(url: string, fromImport: boolean, checkDirectory: boolean): URL | null {
    let stylesheetPath;
    try {
      stylesheetPath = fileURLToPath(url);
    } catch {
      // Only file protocol URLs are supported by this importer
      return null;
    }

    const directory = dirname(stylesheetPath);
    const extension = extname(stylesheetPath);
    const hasStyleExtension =
      extension === '.scss' || extension === '.sass' || extension === '.css';
    // Remove the style extension if present to allow adding the `.import` suffix
    const filename = basename(stylesheetPath, hasStyleExtension ? extension : undefined);

    let entries;
    try {
      entries = this.directoryCache.get(directory);
      if (!entries) {
        entries = readdirSync(directory, { withFileTypes: true });
        this.directoryCache.set(directory, entries);
      }
    } catch {
      return null;
    }

    const importPotentials = new Set<string>();
    const defaultPotentials = new Set<string>();

    if (hasStyleExtension) {
      if (fromImport) {
        importPotentials.add(filename + '.import' + extension);
        importPotentials.add('_' + filename + '.import' + extension);
      }
      defaultPotentials.add(filename + extension);
      defaultPotentials.add('_' + filename + extension);
    } else {
      if (fromImport) {
        importPotentials.add(filename + '.import.scss');
        importPotentials.add(filename + '.import.sass');
        importPotentials.add(filename + '.import.css');
        importPotentials.add('_' + filename + '.import.scss');
        importPotentials.add('_' + filename + '.import.sass');
        importPotentials.add('_' + filename + '.import.css');
      }
      defaultPotentials.add(filename + '.scss');
      defaultPotentials.add(filename + '.sass');
      defaultPotentials.add(filename + '.css');
      defaultPotentials.add('_' + filename + '.scss');
      defaultPotentials.add('_' + filename + '.sass');
      defaultPotentials.add('_' + filename + '.css');
    }

    const foundDefaults: string[] = [];
    const foundImports: string[] = [];
    let hasPotentialIndex = false;
    for (const entry of entries) {
      // Record if the name should be checked as a directory with an index file
      if (checkDirectory && !hasStyleExtension && entry.name === filename && entry.isDirectory()) {
        hasPotentialIndex = true;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (importPotentials.has(entry.name)) {
        foundImports.push(join(directory, entry.name));
      }

      if (defaultPotentials.has(entry.name)) {
        foundDefaults.push(join(directory, entry.name));
      }
    }

    // `foundImports` will only contain elements if `options.fromImport` is true
    const result = this.checkFound(foundImports) ?? this.checkFound(foundDefaults);

    if (result === null && hasPotentialIndex) {
      // Check for index files using filename as a directory
      return this.resolveImport(url + '/index', fromImport, false);
    }

    return result;
  }

  /**
   * Checks an array of potential stylesheet files to determine if there is a valid
   * stylesheet file. More than one discovered file may indicate an error.
   * @param found An array of discovered stylesheet files.
   * @returns A fully resolved URL for a stylesheet file or `null` if not found.
   * @throws If there are ambiguous files discovered.
   */
  private checkFound(found: string[]): URL | null {
    if (found.length === 0) {
      // Not found
      return null;
    }

    // More than one found file may be an error
    if (found.length > 1) {
      // Presence of CSS files alongside a Sass file does not cause an error
      const foundWithoutCss = found.filter((element) => extname(element) !== '.css');
      // If the length is zero then there are two or more css files
      // If the length is more than one than there are two or more sass/scss files
      if (foundWithoutCss.length !== 1) {
        throw new Error('Ambiguous import detected.');
      }

      // Return the non-CSS file (sass/scss files have priority)
      // https://github.com/sass/dart-sass/blob/44d6bb6ac72fe6b93f5bfec371a1fffb18e6b76d/lib/src/importer/utils.dart#L44-L47
      return pathToFileURL(foundWithoutCss[0]);
    }

    return pathToFileURL(found[0]);
  }
}

/**
 * Provides the Sass importer logic to resolve module (npm package) stylesheet imports via both import and
 * use rules and also rebase any `url()` function usage within those stylesheets. The rebasing will ensure that
 * the URLs in the output of the Sass compiler reflect the final filesystem location of the output CSS file.
 */
export class ModuleUrlRebasingImporter extends RelativeUrlRebasingImporter {
  constructor(
    entryDirectory: string,
    directoryCache: Map<string, Dirent[]>,
    rebaseSourceMaps: Map<string, RawSourceMap> | undefined,
    private finder: FileImporter<'sync'>['findFileUrl'],
  ) {
    super(entryDirectory, directoryCache, rebaseSourceMaps);
  }

  override canonicalize(url: string, options: { fromImport: boolean }): URL | null {
    if (url.startsWith('file://')) {
      return super.canonicalize(url, options);
    }

    const result = this.finder(url, options);

    return result ? super.canonicalize(result.href, options) : null;
  }
}

/**
 * Provides the Sass importer logic to resolve load paths located stylesheet imports via both import and
 * use rules and also rebase any `url()` function usage within those stylesheets. The rebasing will ensure that
 * the URLs in the output of the Sass compiler reflect the final filesystem location of the output CSS file.
 */
export class LoadPathsUrlRebasingImporter extends RelativeUrlRebasingImporter {
  constructor(
    entryDirectory: string,
    directoryCache: Map<string, Dirent[]>,
    rebaseSourceMaps: Map<string, RawSourceMap> | undefined,
    private loadPaths: Iterable<string>,
  ) {
    super(entryDirectory, directoryCache, rebaseSourceMaps);
  }

  override canonicalize(url: string, options: { fromImport: boolean }): URL | null {
    if (url.startsWith('file://')) {
      return super.canonicalize(url, options);
    }

    let result = null;
    for (const loadPath of this.loadPaths) {
      result = super.canonicalize(pathToFileURL(join(loadPath, url)).href, options);
      if (result !== null) {
        break;
      }
    }

    return result;
  }
}

/**
 * Workaround for Sass not calling instance methods with `this`.
 * The `canonicalize` and `load` methods will be bound to the class instance.
 * @param importer A Sass importer to bind.
 * @returns The bound Sass importer.
 */
export function sassBindWorkaround<T extends Importer>(importer: T): T {
  importer.canonicalize = importer.canonicalize.bind(importer);
  importer.load = importer.load.bind(importer);

  return importer;
}
