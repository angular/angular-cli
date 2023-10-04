/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { OutputFile, PluginBuild } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ComponentStylesheetBundler } from './component-stylesheets';
import {
  JIT_NAMESPACE_REGEXP,
  JIT_STYLE_NAMESPACE,
  JIT_TEMPLATE_NAMESPACE,
  parseJitUri,
} from './uri';

/**
 * Loads/extracts the contents from a load callback Angular JIT entry.
 * An Angular JIT entry represents either a file path for a component resource or base64
 * encoded data for an inline component resource.
 * @param entry The value that represents content to load.
 * @param root The absolute path for the root of the build (typically the workspace root).
 * @param skipRead If true, do not attempt to read the file; if false, read file content from disk.
 * This option has no effect if the entry does not originate from a file. Defaults to false.
 * @returns An object containing the absolute path of the contents and optionally the actual contents.
 * For inline entries the contents will always be provided.
 */
async function loadEntry(
  entry: string,
  root: string,
  skipRead?: boolean,
): Promise<{ path: string; contents?: string }> {
  if (entry.startsWith('file:')) {
    const specifier = path.join(root, entry.slice(5));

    return {
      path: specifier,
      contents: skipRead ? undefined : await readFile(specifier, 'utf-8'),
    };
  } else if (entry.startsWith('inline:')) {
    const [importer, data] = entry.slice(7).split(';', 2);

    return {
      path: path.join(root, importer),
      contents: Buffer.from(data, 'base64').toString(),
    };
  } else {
    throw new Error('Invalid data for Angular JIT entry.');
  }
}

/**
 * Sets up esbuild resolve and load callbacks to support Angular JIT mode processing
 * for both Component stylesheets and templates. These callbacks work alongside the JIT
 * resource TypeScript transformer to convert and then bundle Component resources as
 * static imports.
 * @param build An esbuild {@link PluginBuild} instance used to add callbacks.
 * @param styleOptions The options to use when bundling stylesheets.
 * @param stylesheetResourceFiles An array where stylesheet resources will be added.
 */
export function setupJitPluginCallbacks(
  build: PluginBuild,
  stylesheetBundler: ComponentStylesheetBundler,
  stylesheetResourceFiles: OutputFile[],
  inlineStyleLanguage: string,
): void {
  const root = build.initialOptions.absWorkingDir ?? '';

  // Add a resolve callback to capture and parse any JIT URIs that were added by the
  // JIT resource TypeScript transformer.
  // Resources originating from a file are resolved as relative from the containing file (importer).
  build.onResolve({ filter: JIT_NAMESPACE_REGEXP }, (args) => {
    const parsed = parseJitUri(args.path);
    if (!parsed) {
      return undefined;
    }

    const { namespace, origin, specifier } = parsed;

    if (origin === 'file') {
      return {
        // Use a relative path to prevent fully resolved paths in the metafile (JSON stats file).
        // This is only necessary for custom namespaces. esbuild will handle the file namespace.
        path: 'file:' + path.relative(root, path.join(path.dirname(args.importer), specifier)),
        namespace,
      };
    } else {
      // Inline data may need the importer to resolve imports/references within the content
      const importer = path.relative(root, args.importer);

      return {
        path: `inline:${importer};${specifier}`,
        namespace,
      };
    }
  });

  // Add a load callback to handle Component stylesheets (both inline and external)
  build.onLoad({ filter: /./, namespace: JIT_STYLE_NAMESPACE }, async (args) => {
    // skipRead is used here because the stylesheet bundling will read a file stylesheet
    // directly either via a preprocessor or esbuild itself.
    const entry = await loadEntry(args.path, root, true /* skipRead */);

    let stylesheetResult;

    // Stylesheet contents only exist for internal stylesheets
    if (entry.contents === undefined) {
      stylesheetResult = await stylesheetBundler.bundleFile(entry.path);
    } else {
      stylesheetResult = await stylesheetBundler.bundleInline(
        entry.contents,
        entry.path,
        inlineStyleLanguage,
      );
    }

    const { contents, resourceFiles, errors, warnings } = stylesheetResult;

    stylesheetResourceFiles.push(...resourceFiles);

    return {
      errors,
      warnings,
      contents,
      loader: 'text',
    };
  });

  // Add a load callback to handle Component templates
  // NOTE: While this callback supports both inline and external templates, the transformer
  // currently only supports generating URIs for external templates.
  build.onLoad({ filter: /./, namespace: JIT_TEMPLATE_NAMESPACE }, async (args) => {
    const { contents } = await loadEntry(args.path, root);

    return {
      contents,
      loader: 'text',
    };
  });
}
