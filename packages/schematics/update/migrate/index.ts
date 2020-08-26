/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
  externalSchematic,
} from '@angular-devkit/schematics';
import * as semver from 'semver';
import { Schema as PostUpdateSchema } from './schema';


/**
 * Cleans up "short" version numbers so they become valid semver. For example;
 *   1 => 1.0.0
 *   1.2 => 1.2.0
 *   1-beta => 1.0.0-beta
 *
 * Exported for testing only.
 */
export function _coerceVersionNumber(version: string): string | null {
  if (!version.match(/^\d{1,30}\.\d{1,30}\.\d{1,30}/)) {
    const match = version.match(/^\d{1,30}(\.\d{1,30})*/);

    if (!match) {
      return null;
    }

    if (!match[1]) {
      version = version.substr(0, match[0].length) + '.0.0' + version.substr(match[0].length);
    } else if (!match[2]) {
      version = version.substr(0, match[0].length) + '.0' + version.substr(match[0].length);
    } else {
      return null;
    }
  }

  return semver.valid(version);
}


export default function(options: PostUpdateSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const schematicsToRun: { name: string; version: string; }[] = [];

    const from = _coerceVersionNumber(options.from);
    if (!from) {
      throw new SchematicsException(
        `Invalid from option: ${JSON.stringify(options.from)}`,
      );
    }

    const to = semver.validRange('<=' + options.to);
    if (!to) {
      throw new SchematicsException(
        `Invalid to option: ${JSON.stringify(options.to)}`,
      );
    }

    // Create the collection for the package.
    const collection = context.engine.createCollection(options.collection);
    for (const name of collection.listSchematicNames()) {
      const schematic = collection.createSchematic(name, true);

      const description: JsonObject = schematic.description as JsonObject;
      let version = description['version'];

      if (typeof version == 'string') {
        version = _coerceVersionNumber(version);

        if (!version) {
          throw new SchematicsException(
            `Invalid migration version: ${JSON.stringify(description['version'])}`,
          );
        }

        if (semver.gt(version, from) &&
            semver.satisfies(version, to, { includePrerelease: true })) {
          schematicsToRun.push({ name, version });
        }
      }
    }

    schematicsToRun.sort((a, b) => {
      const cmp = semver.compare(a.version, b.version);

      // Revert to comparing the names of the collection if the versions are equal.
      return cmp == 0 ? a.name.localeCompare(b.name) : cmp;
    });

    if (schematicsToRun.length > 0) {
      context.logger.info(`** Executing migrations for package '${options.package}' **`);

      const rules = schematicsToRun.map(x => externalSchematic(options.collection, x.name, {}));

      return chain(rules);
    }

    return tree;
  };
}
