/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type JsonObject, type JsonValue, isJsonObject } from '@angular-devkit/core';
import {
  type Rule,
  SchematicsException,
  type Tree,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  noop,
  schematic,
  strings,
  url,
} from '@angular-devkit/schematics';
import { basename, join, relative } from 'node:path/posix';
import { JSONFile } from '../utility/json-file';
import { createProjectSchematic } from '../utility/project';
import { ProjectType } from '../utility/workspace-models';
import type { Schema as EntryPointOptions } from './schema';

function updateTsConfig(packageName: string, ...paths: string[]): Rule {
  return (host: Tree) => {
    if (!host.exists('tsconfig.json')) {
      return host;
    }

    const file = new JSONFile(host, 'tsconfig.json');
    const jsonPath = ['compilerOptions', 'paths', packageName];
    const value = file.get(jsonPath);
    file.modify(jsonPath, Array.isArray(value) ? Array.from(new Set([...value, ...paths])) : paths);
  };
}

export default createProjectSchematic<EntryPointOptions>((options, { project, tree }) => {
  if (project.extensions['projectType'] !== ProjectType.Library) {
    throw new SchematicsException(`Project "${options.project}" is not a library project.`);
  }

  if (options.name === 'lib' || options.name.startsWith('lib/')) {
    throw new SchematicsException(
      `Entry point name "${options.name}" cannot be "lib" or start with "lib/" ` +
        'as it conflicts with the primary entry point source directory.',
    );
  }

  const libDir = project.root;
  const packageJsonPath = join(libDir, 'package.json');
  if (!tree.exists(packageJsonPath)) {
    throw new SchematicsException(`Could not find package.json at "${packageJsonPath}".`);
  }

  const packageJson = new JSONFile(tree, packageJsonPath);
  const rawPackageName = packageJson.get(['name']);
  const packageName =
    typeof rawPackageName === 'string' && rawPackageName
      ? rawPackageName
      : strings.dasherize(options.project);

  const isPrimary = options.name === '.';
  const entryFile = (options.entryFile ?? 'public-api').replace(/\.[cm]?ts$/i, '');
  const sourceRoot = project.sourceRoot ?? join(libDir, 'src');
  const entryPointDir = join(sourceRoot, options.name);
  const exportKey = isPrimary ? '.' : `./${options.name}`;
  const exportTarget = `./${relative(libDir, join(entryPointDir, `${entryFile}.ts`))}`;

  const existingExports = (packageJson.get(['exports']) as JsonValue | undefined) ?? null;
  let exportsObject: JsonObject = {};
  if (typeof existingExports === 'string' || Array.isArray(existingExports)) {
    exportsObject = { '.': existingExports };
  } else if (isJsonObject(existingExports)) {
    const keys = Object.keys(existingExports);
    if (keys.some((k) => k.startsWith('.'))) {
      exportsObject = { ...existingExports };
    } else if (keys.length > 0) {
      exportsObject = { '.': existingExports };
    }
  }

  if (Object.prototype.hasOwnProperty.call(exportsObject, exportKey)) {
    throw new SchematicsException(
      `Entry point "${exportKey}" already exists in "${packageJsonPath}".`,
    );
  }

  if (
    isJsonObject(existingExports) &&
    Object.keys(existingExports).some((k) => k.startsWith('.'))
  ) {
    packageJson.modify(['exports', exportKey], exportTarget);
  } else {
    packageJson.modify(['exports'], {
      ...exportsObject,
      [exportKey]: exportTarget,
    });
  }

  const prefix = options.prefix ?? project.prefix ?? 'lib';
  const sourceDir = join(entryPointDir, 'lib');
  const artifactName = isPrimary
    ? /^@.*\/.*/.test(options.project)
      ? options.project.split('/')[1]
      : options.project
    : basename(options.name);

  const buildOptions = project.targets.get('build')?.options;
  let distRoot: string;
  if (typeof buildOptions?.['outputPath'] === 'string') {
    distRoot = buildOptions['outputPath'];
  } else {
    let folderName = options.project.startsWith('@') ? options.project.slice(1) : options.project;
    if (/[A-Z]/.test(folderName)) {
      folderName = strings.dasherize(folderName);
    }
    distRoot = `dist/${folderName}`;
  }

  const tsConfigPathKey = isPrimary ? packageName : `${packageName}/${options.name}`;
  const tsConfigPathTarget = `./${join(distRoot, options.name)}`;

  const templateSource = apply(url('./files'), [
    applyTemplates({
      ...strings,
      ...options,
      name: artifactName,
      entryFile,
    }),
    move(entryPointDir),
  ]);

  return chain([
    mergeWith(templateSource),
    options.skipTsConfig ? noop() : updateTsConfig(tsConfigPathKey, tsConfigPathTarget),
    options.standalone
      ? noop()
      : schematic('module', {
          name: artifactName,
          commonModule: false,
          flat: true,
          path: sourceDir,
          project: options.project,
          // Explicitly set the `typeSeparator` this also ensures that the generated files are valid even if the `module` schematic
          // inherits its `typeSeparator` from the workspace.
          typeSeparator: '-',
        }),
    schematic('component', {
      name: artifactName,
      selector: `${prefix}-${strings.dasherize(artifactName)}`,
      inlineStyle: true,
      inlineTemplate: true,
      flat: true,
      path: sourceDir,
      export: true,
      standalone: options.standalone,
      skipTests: options.skipTests,
      project: options.project,
      // Explicitly set an empty `type` since it doesn't necessarily make sense in a library.
      // This also ensures that the generated files are valid even if the `component` schematic
      // inherits its `type` from the workspace.
      type: '',
    }),
  ]);
});
