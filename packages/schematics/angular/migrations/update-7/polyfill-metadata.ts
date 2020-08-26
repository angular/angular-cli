/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonObject, JsonParseMode, JsonValue, parseJson } from '@angular-devkit/core';
import { Rule, Tree, chain, noop } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

function isJsonObject(value: JsonValue): value is JsonObject {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Remove the Reflect import from a polyfill file.
 * @param tree The tree to use.
 * @param path Path of the polyfill file found.
 * @private
 */
function _removeReflectFromPolyfills(tree: Tree, path: string) {
  const source = tree.read(path);
  if (!source) {
    return;
  }

  // Start the update of the file.
  const recorder = tree.beginUpdate(path);

  const sourceFile = ts.createSourceFile(path, source.toString(), ts.ScriptTarget.Latest);
  const imports = sourceFile.statements
      .filter(s => s.kind === ts.SyntaxKind.ImportDeclaration) as ts.ImportDeclaration[];

  for (const i of imports) {
    const module = ts.isStringLiteral(i.moduleSpecifier) && i.moduleSpecifier.text;

    switch (module) {
      case 'core-js/es7/reflect':
        recorder.remove(i.getFullStart(), i.getFullWidth());
        break;
    }
  }

  tree.commitUpdate(recorder);
}

/**
 * Update a project's target, maybe. Only if it's a builder supported and the options look right.
 * This is a rule factory so we return the new rule (or noop if we don't support doing the change).
 * @param root The root of the project source.
 * @param targetObject The target information.
 * @private
 */
function _updateProjectTarget(targetObject: JsonObject): Rule {
  // Make sure we're using the correct builder.
  if (targetObject.builder !== '@angular-devkit/build-angular:browser'
      || !isJsonObject(targetObject.options)) {
    return noop();
  }
  const options = targetObject.options;
  if (typeof options.polyfills != 'string') {
    return noop();
  }

  const polyfillsToUpdate = [options.polyfills];
  const configurations = targetObject.configurations;
  if (isJsonObject(configurations)) {
    for (const configName of Object.keys(configurations)) {
      const config = configurations[configName];

      // Just in case, only do non-AOT configurations.
      if (isJsonObject(config)
          && typeof config.polyfills == 'string'
          && config.aot !== true) {
        polyfillsToUpdate.push(config.polyfills);
      }
    }
  }

  return chain(
    polyfillsToUpdate.map(polyfillPath => {
      return (tree: Tree) => _removeReflectFromPolyfills(tree, polyfillPath);
    }),
  );
}

/**
 * Move the import reflect metadata polyfill from the polyfill file to the dev environment. This is
 * not guaranteed to work, but if it doesn't it will result in no changes made.
 */
export function polyfillMetadataRule(): Rule {
  return (tree) => {
    // Simple. Take the ast of polyfills (if it exists) and find the import metadata. Remove it.
    const angularConfigContent = tree.read('angular.json') || tree.read('.angular.json');
    const rules: Rule[] = [];

    if (!angularConfigContent) {
      // Is this even an angular project?
      return;
    }

    const angularJson = parseJson(angularConfigContent.toString(), JsonParseMode.Loose);

    if (!isJsonObject(angularJson) || !isJsonObject(angularJson.projects)) {
      // If that field isn't there, no use...
      return;
    }

    // For all projects, for all targets, read the polyfill field, and read the environment.
    for (const projectName of Object.keys(angularJson.projects)) {
      const project = angularJson.projects[projectName];
      if (!isJsonObject(project)) {
        continue;
      }
      if (typeof project.root != 'string') {
        continue;
      }

      const targets = project.targets || project.architect;
      if (!isJsonObject(targets)) {
        continue;
      }

      for (const targetName of Object.keys(targets)) {
        const target = targets[targetName];
        if (isJsonObject(target)) {
          rules.push(_updateProjectTarget(target));
        }
      }
    }

    // Remove null or undefined rules.
    return chain(rules);
  };
}
