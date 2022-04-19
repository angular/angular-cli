/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject, Path, isJsonObject, normalize, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  apply,
  chain,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { Schema } from './schema';

function addSchematicToCollectionJson(
  collectionPath: Path,
  schematicName: string,
  description: JsonObject,
): Rule {
  return (tree: Tree) => {
    const collectionJson = tree.readJson(collectionPath);

    if (!isJsonObject(collectionJson) || !isJsonObject(collectionJson.schematics)) {
      throw new Error('Invalid collection.json; schematics needs to be an object.');
    }

    collectionJson['schematics'][schematicName] = description;
    tree.overwrite(collectionPath, JSON.stringify(collectionJson, undefined, 2));
  };
}

export default function (options: Schema): Rule {
  const schematicsVersion = require('@angular-devkit/schematics/package.json').version;
  const coreVersion = require('@angular-devkit/core/package.json').version;

  // Verify if we need to create a full project, or just add a new schematic.
  return (tree: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('name option is required.');
    }

    let collectionPath: Path | undefined;
    try {
      const packageJson = tree.readJson('/package.json') as {
        schematics: unknown;
      };
      if (typeof packageJson.schematics === 'string') {
        const p = normalize(packageJson.schematics);
        if (tree.exists(p)) {
          collectionPath = p;
        }
      }
    } catch {}

    let source = apply(url('./schematic-files'), [
      template({
        ...options,
        coreVersion,
        schematicsVersion,
        dot: '.',
        camelize: strings.camelize,
        dasherize: strings.dasherize,
      }),
    ]);

    // Simply create a new schematic project.
    if (!collectionPath) {
      collectionPath = normalize('/' + options.name + '/src/collection.json');
      source = apply(url('./project-files'), [
        template({
          ...(options as object),
          coreVersion,
          schematicsVersion,
          dot: '.',
          camelize: strings.camelize,
          dasherize: strings.dasherize,
        }),
        mergeWith(source),
        move(options.name),
      ]);

      context.addTask(new NodePackageInstallTask(options.name));
    }

    return chain([
      mergeWith(source),
      addSchematicToCollectionJson(collectionPath, strings.dasherize(options.name), {
        description: 'A blank schematic.',
        factory:
          './' + strings.dasherize(options.name) + '/index#' + strings.camelize(options.name),
      }),
    ]);
  };
}
