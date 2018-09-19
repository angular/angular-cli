/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
import {
  JsonParseMode,
  experimental,
  getSystemPath,
  join,
  normalize,
  parseJson,
} from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
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
import { Observable } from 'rxjs';
import { Readable, Writable } from 'stream';
import { Schema as PwaOptions } from './schema';

const RewritingStream = require('parse5-html-rewriting-stream');


function getWorkspace(
  host: Tree,
): { path: string, workspace: experimental.workspace.WorkspaceSchema } {
  const possibleFiles = [ '/angular.json', '/.angular.json' ];
  const path = possibleFiles.filter(path => host.exists(path))[0];

  const configBuffer = host.read(path);
  if (configBuffer === null) {
    throw new SchematicsException(`Could not find (${path})`);
  }
  const content = configBuffer.toString();

  return {
    path,
    workspace: parseJson(
      content,
      JsonParseMode.Loose,
    ) as {} as experimental.workspace.WorkspaceSchema,
  };
}

function updateIndexFile(path: string): Rule {
  return (host: Tree) => {
    const buffer = host.read(path);
    if (buffer === null) {
      throw new SchematicsException(`Could not read index file: ${path}`);
    }

    const rewriter = new RewritingStream();

    let needsNoScript = true;
    rewriter.on('startTag', (startTag: { tagName: string }) => {
      if (startTag.tagName === 'noscript') {
        needsNoScript = false;
      }

      rewriter.emitStartTag(startTag);
    });

    rewriter.on('endTag', (endTag: { tagName: string }) => {
      if (endTag.tagName === 'head') {
        rewriter.emitRaw('  <link rel="manifest" href="manifest.json">\n');
        rewriter.emitRaw('  <meta name="theme-color" content="#1976d2">\n');
      } else if (endTag.tagName === 'body' && needsNoScript) {
        rewriter.emitRaw(
          '  <noscript>Please enable JavaScript to continue using this application.</noscript>\n',
        );
      }

      rewriter.emitEndTag(endTag);
    });

    return new Observable<Tree>(obs => {
      const input = new Readable({
        encoding: 'utf8',
        read(): void {
          this.push(buffer);
          this.push(null);
        },
      });

      const chunks: Array<Buffer> = [];
      const output = new Writable({
        write(chunk: string | Buffer, encoding: string, callback: Function): void {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk);
          callback();
        },
        final(callback: (error?: Error) => void): void {
          const full = Buffer.concat(chunks);
          host.overwrite(path, full.toString());
          callback();
          obs.next(host);
          obs.complete();
        },
      });

      input.pipe(rewriter).pipe(output);
    });
  };
}

export default function (options: PwaOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.title) {
      options.title = options.project;
    }
    const {path: workspacePath, workspace } = getWorkspace(host);

    if (!options.project) {
      throw new SchematicsException('Option "project" is required.');
    }

    const project = workspace.projects[options.project];
    if (!project) {
      throw new SchematicsException(`Project is not defined in this workspace.`);
    }

    if (project.projectType !== 'application') {
      throw new SchematicsException(`PWA requires a project type of "application".`);
    }

    // Find all the relevant targets for the project
    const projectTargets = project.targets || project.architect;
    if (!projectTargets || Object.keys(projectTargets).length === 0) {
      throw new SchematicsException(`Targets are not defined for this project.`);
    }

    const buildTargets = [];
    const testTargets = [];
    for (const targetName in projectTargets) {
      const target = projectTargets[targetName];
      if (!target) {
        continue;
      }

      if (target.builder === '@angular-devkit/build-angular:browser') {
        buildTargets.push(target);
      } else if (target.builder === '@angular-devkit/build-angular:karma') {
        testTargets.push(target);
      }
    }

    // Add manifest to asset configuration
    const assetEntry = join(normalize(project.root), 'src', 'manifest.json');
    for (const target of [...buildTargets, ...testTargets]) {
      if (target.options) {
        if (target.options.assets) {
          target.options.assets.push(assetEntry);
        } else {
          target.options.assets = [ assetEntry ];
        }
      } else {
        target.options = { assets: [ assetEntry ] };
      }
    }
    host.overwrite(workspacePath, JSON.stringify(workspace, null, 2));

    // Find all index.html files in build targets
    const indexFiles = new Set<string>();
    for (const target of buildTargets) {
      if (target.options && target.options.index) {
        indexFiles.add(target.options.index);
      }

      if (!target.configurations) {
        continue;
      }
      for (const configName in target.configurations) {
        const configuration = target.configurations[configName];
        if (configuration && configuration.index) {
          indexFiles.add(configuration.index);
        }
      }
    }

    // Setup sources for the assets files to add to the project
    const sourcePath = join(normalize(project.root), 'src');
    const assetsPath = join(sourcePath, 'assets');
    const rootTemplateSource = apply(url('./files/root'), [
      template({ ...options }),
      move(getSystemPath(sourcePath)),
    ]);
    const assetsTemplateSource = apply(url('./files/assets'), [
      template({ ...options }),
      move(getSystemPath(assetsPath)),
    ]);

    // Setup service worker schematic options
    const swOptions = { ...options };
    delete swOptions.title;

    // Chain the rules and return
    return chain([
      externalSchematic('@schematics/angular', 'service-worker', swOptions),
      mergeWith(rootTemplateSource),
      mergeWith(assetsTemplateSource),
      ...[...indexFiles].map(path => updateIndexFile(path)),
    ])(host, context);
  };
}
