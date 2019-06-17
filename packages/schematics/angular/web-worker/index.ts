/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonParseMode,
  dirname,
  join,
  normalize,
  parseJsonAst,
  strings,
  tags,
} from '@angular-devkit/core';
import {
  Rule, SchematicContext, SchematicsException, Tree,
  apply, applyTemplates, chain, mergeWith, move, noop, url,
} from '@angular-devkit/schematics';
import { appendValueInAstArray, findPropertyInAstObject } from '../utility/json-utils';
import { parseName } from '../utility/parse-name';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { buildDefaultPath, getWorkspace, updateWorkspace } from '../utility/workspace';
import { BrowserBuilderOptions, LintBuilderOptions } from '../utility/workspace-models';
import { Schema as WebWorkerOptions } from './schema';


function addConfig(options: WebWorkerOptions, root: string, tsConfigPath: string): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('updating project configuration.');

    // Add worker glob exclusion to tsconfig.app.json.
    // Projects pre version 8 should to have tsconfig.app.json inside their application
    const isInSrc = dirname(normalize(tsConfigPath)).endsWith('src');
    const workerGlob = `${isInSrc ? '' : 'src/'}**/*.worker.ts`;

    const buffer = host.read(tsConfigPath);
    if (buffer) {
      const tsCfgAst = parseJsonAst(buffer.toString(), JsonParseMode.Loose);
      if (tsCfgAst.kind != 'object') {
        throw new SchematicsException('Invalid tsconfig. Was expecting an object');
      }
      const filesAstNode = findPropertyInAstObject(tsCfgAst, 'exclude');
      if (filesAstNode && filesAstNode.kind != 'array') {
        throw new SchematicsException('Invalid tsconfig "exclude" property; expected an array.');
      }

      if (filesAstNode && !filesAstNode.value.includes(workerGlob)) {
        const recorder = host.beginUpdate(tsConfigPath);
        appendValueInAstArray(recorder, filesAstNode, workerGlob);
        host.commitUpdate(recorder);
      }
    }

    return mergeWith(
      apply(url('./files/worker-tsconfig'), [
        applyTemplates({
          ...options,
          relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(root),
        }),
        move(root),
      ]),
    );
  };
}

function addSnippet(options: WebWorkerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('Updating appmodule');

    if (options.path === undefined) {
      return;
    }

    const fileRegExp = new RegExp(`^${options.name}.*\.ts`);
    const siblingModules = host.getDir(options.path).subfiles
      // Find all files that start with the same name, are ts files,
      // and aren't spec or module files.
      .filter(f => fileRegExp.test(f) && !/(module|spec)\.ts$/.test(f))
      // Sort alphabetically for consistency.
      .sort();

    if (siblingModules.length === 0) {
      // No module to add in.
      return;
    }

    const siblingModulePath = `${options.path}/${siblingModules[0]}`;
    const logMessage = 'console.log(`page got message: ${data}`);';
    const workerCreationSnippet = tags.stripIndent`
      if (typeof Worker !== 'undefined') {
        // Create a new
        const worker = new Worker('./${options.name}.worker', { type: 'module' });
        worker.onmessage = ({ data }) => {
          ${logMessage}
        };
        worker.postMessage('hello');
      } else {
        // Web Workers are not supported in this environment.
        // You should add a fallback so that your program still executes correctly.
      }
    `;

    // Append the worker creation snippet.
    const originalContent = host.read(siblingModulePath);
    host.overwrite(siblingModulePath, originalContent + '\n' + workerCreationSnippet);

    return host;
  };
}

export default function (options: WebWorkerOptions): Rule {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host);

    if (!options.project) {
      throw new SchematicsException('Option "project" is required.');
    }
    if (!options.target) {
      throw new SchematicsException('Option "target" is required.');
    }

    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Invalid project name (${options.project})`);
    }
    const projectType = project.extensions['projectType'];
    if (projectType !== 'application') {
      throw new SchematicsException(`Web Worker requires a project type of "application".`);
    }

    const projectTarget = project.targets.get(options.target);
    if (!projectTarget) {
      throw new Error(`Target is not defined for this project.`);
    }
    const projectTargetOptions = (projectTarget.options || {}) as unknown as BrowserBuilderOptions;

    if (options.path === undefined) {
      options.path = buildDefaultPath(project);
    }
    const parsedPath = parseName(options.path, options.name);
    options.name = parsedPath.name;
    options.path = parsedPath.path;
    const root = project.root || '';

    const needWebWorkerConfig = !projectTargetOptions.webWorkerTsConfig;
    if (needWebWorkerConfig) {
      const workerConfigPath = join(normalize(root), 'tsconfig.worker.json');
      projectTargetOptions.webWorkerTsConfig = workerConfigPath;

      // add worker tsconfig to lint architect target
      const lintTarget = project.targets.get('lint');
      if (lintTarget) {
        const lintOptions = (lintTarget.options || {}) as unknown as LintBuilderOptions;
        lintOptions.tsConfig = (lintOptions.tsConfig || []).concat(workerConfigPath);
      }
    }

    const templateSource = apply(url('./files/worker'), [
      applyTemplates({ ...options, ...strings }),
      move(parsedPath.path),
    ]);

    return chain([
      // Add project configuration.
      needWebWorkerConfig ? addConfig(options, root, projectTargetOptions.tsConfig) : noop(),
      needWebWorkerConfig ? updateWorkspace(workspace) : noop(),
      // Create the worker in a sibling module.
      options.snippet ? addSnippet(options) : noop(),
      // Add the worker.
      mergeWith(templateSource),
    ]);
  };
}
