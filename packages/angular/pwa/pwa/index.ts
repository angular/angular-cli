/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  SchematicsException,
  Tree,
  apply,
  chain,
  externalSchematic,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { posix } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Schema as PwaOptions } from './schema';

function updateIndexFile(path: string): Rule {
  return async (host: Tree) => {
    const originalContent = host.readText(path);

    const { RewritingStream } = await loadEsmModule<typeof import('parse5-html-rewriting-stream')>(
      'parse5-html-rewriting-stream',
    );

    const rewriter = new RewritingStream();
    let needsNoScript = true;
    rewriter.on('startTag', (startTag) => {
      if (startTag.tagName === 'noscript') {
        needsNoScript = false;
      }

      rewriter.emitStartTag(startTag);
    });

    rewriter.on('endTag', (endTag) => {
      if (endTag.tagName === 'head') {
        rewriter.emitRaw('  <link rel="manifest" href="manifest.webmanifest">\n');
        rewriter.emitRaw('  <meta name="theme-color" content="#1976d2">\n');
      } else if (endTag.tagName === 'body' && needsNoScript) {
        rewriter.emitRaw(
          '  <noscript>Please enable JavaScript to continue using this application.</noscript>\n',
        );
      }

      rewriter.emitEndTag(endTag);
    });

    return pipeline(Readable.from(originalContent), rewriter, async function (source) {
      const chunks = [];
      for await (const chunk of source) {
        chunks.push(Buffer.from(chunk));
      }
      host.overwrite(path, Buffer.concat(chunks));
    });
  };
}

export default function (options: PwaOptions): Rule {
  return async (host) => {
    if (!options.title) {
      options.title = options.project;
    }

    const workspace = await readWorkspace(host);

    if (!options.project) {
      throw new SchematicsException('Option "project" is required.');
    }

    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project is not defined in this workspace.`);
    }

    if (project.extensions['projectType'] !== 'application') {
      throw new SchematicsException(`PWA requires a project type of "application".`);
    }

    // Find all the relevant targets for the project
    if (project.targets.size === 0) {
      throw new SchematicsException(`Targets are not defined for this project.`);
    }

    const buildTargets = [];
    const testTargets = [];
    for (const target of project.targets.values()) {
      if (
        target.builder === '@angular-devkit/build-angular:browser' ||
        target.builder === '@angular-devkit/build-angular:application'
      ) {
        buildTargets.push(target);
      } else if (target.builder === '@angular-devkit/build-angular:karma') {
        testTargets.push(target);
      }
    }

    // Find all index.html files in build targets
    const indexFiles = new Set<string>();
    for (const target of buildTargets) {
      if (typeof target.options?.index === 'string') {
        indexFiles.add(target.options.index);
      }

      if (!target.configurations) {
        continue;
      }

      for (const options of Object.values(target.configurations)) {
        if (typeof options?.index === 'string') {
          indexFiles.add(options.index);
        }
      }
    }

    // Setup sources for the assets files to add to the project
    const sourcePath = project.sourceRoot ?? posix.join(project.root, 'src');

    // Setup service worker schematic options
    const { title, ...swOptions } = options;

    await writeWorkspace(host, workspace);
    let assetsDir = posix.join(sourcePath, 'assets');
    let iconsPath: string;
    if (host.exists(assetsDir)) {
      // Add manifest to asset configuration
      const assetEntry = posix.join(
        project.sourceRoot ?? posix.join(project.root, 'src'),
        'manifest.webmanifest',
      );
      for (const target of [...buildTargets, ...testTargets]) {
        if (target.options) {
          if (Array.isArray(target.options.assets)) {
            target.options.assets.push(assetEntry);
          } else {
            target.options.assets = [assetEntry];
          }
        } else {
          target.options = { assets: [assetEntry] };
        }
      }
      iconsPath = 'assets';
    } else {
      assetsDir = posix.join(project.root, 'public');
      iconsPath = 'icons';
    }

    return chain([
      externalSchematic('@schematics/angular', 'service-worker', swOptions),
      mergeWith(
        apply(url('./files/assets'), [template({ ...options, iconsPath }), move(assetsDir)]),
      ),
      ...[...indexFiles].map((path) => updateIndexFile(path)),
    ]);
  };
}

/**
 * This uses a dynamic import to load a module which may be ESM.
 * CommonJS code can load ESM code via a dynamic import. Unfortunately, TypeScript
 * will currently, unconditionally downlevel dynamic import into a require call.
 * require calls cannot load ESM code and will result in a runtime error. To workaround
 * this, a Function constructor is used to prevent TypeScript from changing the dynamic import.
 * Once TypeScript provides support for keeping the dynamic import this workaround can
 * be dropped.
 *
 * @param modulePath The path of the module to load.
 * @returns A Promise that resolves to the dynamically imported module.
 */
function loadEsmModule<T>(modulePath: string | URL): Promise<T> {
  return new Function('modulePath', `return import(modulePath);`)(modulePath) as Promise<T>;
}
