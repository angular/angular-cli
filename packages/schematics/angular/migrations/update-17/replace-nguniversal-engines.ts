/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DirEntry, Rule, chain } from '@angular-devkit/schematics';
import { addDependency } from '../../utility';
import { removePackageJsonDependency } from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';
import { allTargetOptions, getWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

function* visit(directory: DirEntry): IterableIterator<[fileName: string, contents: string]> {
  for (const path of directory.subfiles) {
    if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
      const entry = directory.file(path);
      if (entry) {
        const content = entry.content;
        if (content.includes('@nguniversal/')) {
          // Only need to rename the import so we can just string replacements.
          yield [entry.path, content.toString()];
        }
      }
    }
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules' || path.startsWith('.')) {
      continue;
    }

    yield* visit(directory.dir(path));
  }
}

/**
 * Regexp to match Universal packages.
 * @nguniversal/common/engine
 * @nguniversal/common
 * @nguniversal/express-engine
 **/
const NGUNIVERSAL_PACKAGE_REGEXP = /@nguniversal\/(common(\/engine)?|express-engine)/g;

export default function (): Rule {
  return chain([
    async (tree) => {
      // Replace server file.
      const workspace = await getWorkspace(tree);
      for (const [, project] of workspace.projects) {
        if (project.extensions.projectType !== ProjectType.Application) {
          continue;
        }

        const serverMainFiles = new Map<string /** Main Path */, string /** Output Path */>();
        for (const [, target] of project.targets) {
          if (target.builder !== Builders.Server) {
            continue;
          }

          const outputPath = project.targets.get('build')?.options?.outputPath;

          for (const [, { main }] of allTargetOptions(target, false)) {
            if (
              typeof main === 'string' &&
              typeof outputPath === 'string' &&
              tree.readText(main).includes('ngExpressEngine')
            ) {
              serverMainFiles.set(main, outputPath);
            }
          }
        }

        // Replace server file
        for (const [path, outputPath] of serverMainFiles.entries()) {
          tree.rename(path, path + '.bak');
          tree.create(path, getServerFileContents(outputPath));
        }
      }

      // Replace all import specifiers in all files.
      for (const file of visit(tree.root)) {
        const [path, content] = file;
        tree.overwrite(path, content.replaceAll(NGUNIVERSAL_PACKAGE_REGEXP, '@angular/ssr'));
      }

      // Remove universal packages from deps.
      removePackageJsonDependency(tree, '@nguniversal/express-engine');
      removePackageJsonDependency(tree, '@nguniversal/common');
    },
    addDependency('@angular/ssr', latestVersions.AngularSSR),
  ]);
}

function getServerFileContents(outputPath: string): string {
  return `
import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import * as express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import bootstrap from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), '${outputPath}');
  const indexHtml = existsSync(join(distFolder, 'index.original.html'))
    ? join(distFolder, 'index.original.html')
    : join(distFolder, 'index.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: req.originalUrl,
        publicPath: distFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(\`Node Express server listening on http://localhost:\${port}\`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export default bootstrap;
`;
}
