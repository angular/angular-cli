/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonParseMode, parseJsonAst, strings, tags } from '@angular-devkit/core';
import {
  Rule, SchematicContext, SchematicsException, Tree,
  apply, applyTemplates, chain, mergeWith, move, noop, url,
} from '@angular-devkit/schematics';
import { appendValueInAstArray, findPropertyInAstObject } from '../utility/json-utils';
import { parseName } from '../utility/parse-name';
import { buildDefaultPath, getWorkspace, updateWorkspace } from '../utility/workspace';
import { BrowserBuilderOptions, LintBuilderOptions } from '../utility/workspace-models';
import { Schema as WebWorkerOptions } from './schema';


function addConfig(options: WebWorkerOptions, root: string, tsConfigPath: string): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('updating project configuration.');

    const tsConfigRules = [];

    // Add tsconfig.worker.json.
    const relativePathToWorkspaceRoot = root.split('/').map(x => '..').join('/');
    tsConfigRules.push(mergeWith(apply(url('./files/worker-tsconfig'), [
      applyTemplates({ ...options, relativePathToWorkspaceRoot }),
      move(root),
    ])));

    // Add project tsconfig.json.
    // The project level tsconfig.json with webworker lib is for editor support since
    // the dom and webworker libs are mutually exclusive.
    // Note: this schematic does not change other tsconfigs to use the project-level tsconfig.
    const projectTsConfigPath = `${root}/tsconfig.json`;
    if (host.exists(projectTsConfigPath)) {
      // If the file already exists, alter it.
      const buffer = host.read(projectTsConfigPath);
      if (buffer) {
        const tsCfgAst = parseJsonAst(buffer.toString(), JsonParseMode.Loose);
        if (tsCfgAst.kind != 'object') {
          throw new SchematicsException('Invalid tsconfig. Was expecting an object');
        }
        const optsAstNode = findPropertyInAstObject(tsCfgAst, 'compilerOptions');
        if (optsAstNode && optsAstNode.kind != 'object') {
          throw new SchematicsException(
            'Invalid tsconfig "compilerOptions" property; Was expecting an object.');
        }
        const libAstNode = findPropertyInAstObject(tsCfgAst, 'lib');
        if (libAstNode && libAstNode.kind != 'array') {
          throw new SchematicsException('Invalid tsconfig "lib" property; expected an array.');
        }
        const newLibProp = 'webworker';
        if (libAstNode && !libAstNode.value.includes(newLibProp)) {
          const recorder = host.beginUpdate(projectTsConfigPath);
          appendValueInAstArray(recorder, libAstNode, newLibProp);
          host.commitUpdate(recorder);
        }
      }
    } else {
      // Otherwise create it.
      tsConfigRules.push(mergeWith(apply(url('./files/project-tsconfig'), [
        applyTemplates({ ...options, relativePathToWorkspaceRoot }),
        move(root),
      ])));
    }

    // Add worker glob exclusion to tsconfig.app.json.
    const workerGlob = '**/*.worker.ts';
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

      if (filesAstNode && filesAstNode.value.indexOf(workerGlob) == -1) {
        const recorder = host.beginUpdate(tsConfigPath);
        appendValueInAstArray(recorder, filesAstNode, workerGlob);
        host.commitUpdate(recorder);
      }
    }

    return chain([
      // Add tsconfigs.
      ...tsConfigRules,
    ]);
  };
}

function addSnippet(options: WebWorkerOptions): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.debug('Updating appmodule');

    if (options.path === undefined) {
      return;
    }

    const siblingModules = host.getDir(options.path).subfiles
      // Find all files that start with the same name, are ts files, and aren't spec files.
      .filter(f => f.startsWith(options.name) && f.endsWith('.ts') && !f.endsWith('spec.ts'))
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
      throw new SchematicsException('Option (target) is required.');
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
    const root = project.root || project.sourceRoot || '';

    const needWebWorkerConfig = !projectTargetOptions.webWorkerTsConfig;
    if (needWebWorkerConfig) {
      const workerConfigPath = `${root.endsWith('/') ? root : root + '/'}tsconfig.worker.json`;
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
