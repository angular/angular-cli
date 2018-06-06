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
  branchAndMerge,
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
  let hitNonSpace = false;
  text.split('')
    .forEach(char => {
      if (char === ' ' && !hitNonSpace) {
        indent += ' ';
      } else {
        hitNonSpace = true;
      }
    }, 0);

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
    let closingHeadTagLine = '';
    let closingBodyTagLineIndex = -1;
    let closingBodyTagLine = '';
    lines.forEach((line: string, index: number) => {
      if (/<\/head>/.test(line) && closingHeadTagLineIndex === -1) {
        closingHeadTagLine = line;
        closingHeadTagLineIndex = index;
      }

      if (/<\/body>/.test(line) && closingBodyTagLineIndex === -1) {
        closingBodyTagLine = line;
        closingBodyTagLineIndex = index;
      }
    });

    const headTagIndent = getIndent(closingHeadTagLine) + '  ';
    const itemsToAddToHead = [
      '<link rel="manifest" href="manifest.json">',
      '<meta name="theme-color" content="#1976d2">',
    ];

    const textToInsertIntoHead = itemsToAddToHead
      .map(text => headTagIndent + text)
      .join('\n');

    const bodyTagIndent = getIndent(closingBodyTagLine) + '  ';
    const itemsToAddToBody
      = '<noscript>Please enable JavaScript to continue using this application.</noscript>';

    const textToInsertIntoBody = bodyTagIndent + itemsToAddToBody;

    const updatedIndex = [
      ...lines.slice(0, closingHeadTagLineIndex),
      textToInsertIntoHead,
      ...lines.slice(closingHeadTagLineIndex, closingBodyTagLineIndex),
      textToInsertIntoBody,
      ...lines.slice(closingBodyTagLineIndex),
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

      if (!applyTo.assets) {
        applyTo.assets = [assetEntry];
      } else {
        applyTo.assets.push(assetEntry);
      }

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

    const assetPath = join(project.root as Path, 'src', 'assets');
    const sourcePath = join(project.root as Path, 'src');

    options.title = options.title || options.project;

    const templateSource = apply(url('./files/assets'), [
      template({
        ...options,
      }),
      move(assetPath),
    ]);

    return chain([
      addServiceWorker(options),
      branchAndMerge(chain([
        mergeWith(templateSource),
      ])),
      mergeWith(apply(url('./files/root'), [
        template({...options}),
        move(sourcePath),
      ])),
      updateIndexFile(options),
      addManifestToAssetsConfig(options),
    ]);
  };
}
