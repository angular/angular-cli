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
import { Builders, ProjectType } from '../utility/workspace-models';
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

  const buildTarget = project.targets.get('build');
  if (buildTarget?.builder !== Builders.BuildLibrary) {
    throw new SchematicsException(
      `Project "${options.project}" does not use the "${Builders.BuildLibrary}" builder.`,
    );
  }

  if (options.name === 'package.json') {
    throw new SchematicsException('Entry point name "package.json" is reserved.');
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
  const entryFile = (options.entryFile ?? 'public-api').replace(/\.ts$/i, '');
  const entryPointDir = join(libDir, options.name, 'src');
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
    packageJson.modify(['exports', exportKey], exportTarget, false);
  } else {
    packageJson.modify(
      ['exports'],
      {
        ...exportsObject,
        [exportKey]: exportTarget,
      },
      false,
    );
  }

  const prefix = (options.prefix ?? project.prefix) || 'lib';
  const sourceDir = isPrimary ? join(entryPointDir, 'lib') : entryPointDir;
  const artifactName = isPrimary
    ? /^@.*\/.*/.test(options.project)
      ? options.project.split('/')[1]
      : options.project
    : basename(options.name);

  const buildOptions = buildTarget.options;
  const distRoot =
    typeof buildOptions?.['outputPath'] === 'string'
      ? buildOptions['outputPath']
      : join('dist', options.project);

  const tsConfigPathKey = isPrimary ? packageName : `${packageName}/*`;
  const tsConfigPathTarget = `./${join(distRoot, isPrimary ? '.' : '*')}`;

  const standalone = options.standalone ?? true;

  const templateSource = apply(url('../entry-point/files'), [
    applyTemplates({
      ...strings,
      ...options,
      isPrimary,
      standalone,
      name: artifactName,
      entryFile,
    }),
    move(entryPointDir),
  ]);

  return chain([
    mergeWith(templateSource),
    options.skipTsConfig ? noop() : updateTsConfig(tsConfigPathKey, tsConfigPathTarget),
    standalone
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
      standalone,
      skipTests: options.skipTests,
      project: options.project,
      // Explicitly set an empty `type` and `exportDefault: false` since they don't necessarily make
      // sense in a library and ensure that the generated files match the entry-point exports even
      // if the `component` schematic inherits options from the workspace.
      type: '',
      exportDefault: false,
    }),
  ]);
});
