/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
import { Path, join, normalize } from '@angular-devkit/core';
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
import { getWorkspace, getWorkspacePath } from '../utility/config';
import { Schema as PwaOptions } from './schema';


function addServiceWorker(options: PwaOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('Adding service worker...');

    const swOptions = {
      ...options,
    };
    delete swOptions.title;

    return externalSchematic('@schematics/angular', 'service-worker', swOptions);
  };
}

function getIndent(text: string): string {
  let indent = '';

  for (const char of text) {
    if (char === ' ' || char === '\t') {
      indent += char;
    } else {
      break;
    }
  }

  return indent;
}

function updateIndexFile(options: PwaOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    const workspace = getWorkspace(host);
    const project = workspace.projects[options.project as string];
    let path: string;
    if (project && project.architect && project.architect.build &&
        project.architect.build.options.index) {
      path = project.architect.build.options.index;
    } else {
      throw new SchematicsException('Could not find index file for the project');
    }
    const buffer = host.read(path);
    if (buffer === null) {
      throw new SchematicsException(`Could not read index file: ${path}`);
    }
    const content = buffer.toString();
    const lines = content.split('\n');
    let closingHeadTagLineIndex = -1;
    let closingBodyTagLineIndex = -1;
    lines.forEach((line, index) => {
      if (closingHeadTagLineIndex === -1 && /<\/head>/.test(line)) {
        closingHeadTagLineIndex = index;
      } else if (closingBodyTagLineIndex === -1 && /<\/body>/.test(line)) {
        closingBodyTagLineIndex = index;
      }
    });

    const headIndent = getIndent(lines[closingHeadTagLineIndex]) + '  ';
    const itemsToAddToHead = [
      '<link rel="manifest" href="manifest.json">',
      '<meta name="theme-color" content="#1976d2">',
    ];

    const bodyIndent = getIndent(lines[closingBodyTagLineIndex]) + '  ';
    const itemsToAddToBody = [
      '<noscript>Please enable JavaScript to continue using this application.</noscript>',
    ];

    const updatedIndex = [
      ...lines.slice(0, closingHeadTagLineIndex),
      ...itemsToAddToHead.map(line => headIndent + line),
      ...lines.slice(closingHeadTagLineIndex, closingBodyTagLineIndex),
      ...itemsToAddToBody.map(line => bodyIndent + line),
      ...lines.slice(closingHeadTagLineIndex),
    ].join('\n');

    host.overwrite(path, updatedIndex);

    return host;
  };
}

function addManifestToAssetsConfig(options: PwaOptions) {
  return (host: Tree, context: SchematicContext) => {

    const workspacePath = getWorkspacePath(host);
    const workspace = getWorkspace(host);
    const project = workspace.projects[options.project as string];

    if (!project) {
      throw new Error(`Project is not defined in this workspace.`);
    }

    const assetEntry = join(normalize(project.root), 'src', 'manifest.json');

    if (!project.architect) {
      throw new Error(`Architect is not defined for this project.`);
    }

    const architect = project.architect;

    ['build', 'test'].forEach((target) => {

      const applyTo = architect[target].options;
      const assets = applyTo.assets || (applyTo.assets = []);

      assets.push(assetEntry);

    });

    host.overwrite(workspacePath, JSON.stringify(workspace, null, 2));

    return host;
  };
}

export default function (options: PwaOptions): Rule {
  return (host: Tree) => {
    const workspace = getWorkspace(host);
    if (!options.project) {
      throw new SchematicsException('Option "project" is required.');
    }
    const project = workspace.projects[options.project];
    if (project.projectType !== 'application') {
      throw new SchematicsException(`PWA requires a project type of "application".`);
    }

    const sourcePath = join(project.root as Path, 'src');
    const assetsPath = join(sourcePath, 'assets');

    options.title = options.title || options.project;

    const rootTemplateSource = apply(url('./files/root'), [
      template({ ...options }),
      move(sourcePath),
    ]);
    const assetsTemplateSource = apply(url('./files/assets'), [
      template({ ...options }),
      move(assetsPath),
    ]);

    return chain([
      addServiceWorker(options),
      mergeWith(rootTemplateSource),
      mergeWith(assetsTemplateSource),
      updateIndexFile(options),
      addManifestToAssetsConfig(options),
    ]);
  };
}
