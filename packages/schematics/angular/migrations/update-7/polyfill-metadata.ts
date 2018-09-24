/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json } from '@angular-devkit/core';
import { Rule, Tree, chain, noop } from '@angular-devkit/schematics';
import * as ts from 'typescript';


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
  const imports = (
    sourceFile.statements
      .filter(s => s.kind === ts.SyntaxKind.ImportDeclaration) as ts.ImportDeclaration[]
  );

  for (const i of imports) {
    const module = i.moduleSpecifier.kind == ts.SyntaxKind.StringLiteral
      && (i.moduleSpecifier as ts.StringLiteral).text;

    switch (module) {
      case 'core-js/es7/reflect':
        recorder.remove(i.getStart(sourceFile), i.getWidth(sourceFile));
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
function _updateProjectTarget(root: string, targetObject: json.JsonObject): Rule {
  // Make sure we're using the correct builder.
  if (targetObject.builder !== '@angular-devkit/build-angular:browser'
      || !json.isJsonObject(targetObject.options)) {
    return noop();
  }
  const options = targetObject.options;
  if (typeof options.polyfills != 'string') {
    return noop();
  }

  const polyfillsToUpdate = [`${root}/${options.polyfills}`];
  const configurations = targetObject.configurations;
  if (json.isJsonObject(configurations)) {
    for (const configName of Object.keys(configurations)) {
      const config = configurations[configName];

      // Just in case, only do non-AOT configurations.
      if (json.isJsonObject(config)
          && typeof config.polyfills == 'string'
          && config.aot !== true) {
        polyfillsToUpdate.push(`${root}/${config.polyfills}`);
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

    const angularJson = json.parseJson(angularConfigContent.toString(), json.JsonParseMode.Loose);

    if (!json.isJsonObject(angularJson) || !json.isJsonObject(angularJson.projects)) {
      // If that field isn't there, no use...
      return;
    }

    // For all projects, for all targets, read the polyfill field, and read the environment.
    for (const projectName of Object.keys(angularJson.projects)) {
      const project = angularJson.projects[projectName];
      if (!json.isJsonObject(project)) {
        continue;
      }
      if (typeof project.root != 'string') {
        continue;
      }

      const targets = project.targets || project.architect;
      if (!json.isJsonObject(targets)) {
        continue;
      }

      for (const targetName of Object.keys(targets)) {
        const target = targets[targetName];
        if (json.isJsonObject(target)) {
          rules.push(_updateProjectTarget(project.root, target));
        }
      }
    }

    // Remove null or undefined rules.
    return chain(rules);
  };
}
