/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonAstObject, JsonValue, parseJsonAst } from '@angular-devkit/core';
import {
  Rule,
  Tree,
  UpdateRecorder,
  apply,
  chain,
  mergeWith,
  template,
  url,
} from '@angular-devkit/schematics';
import { Schema } from './schema';


function appendPropertyInAstObject(
  recorder: UpdateRecorder,
  node: JsonAstObject,
  propertyName: string,
  value: JsonValue,
  indent = 4,
) {
  const indentStr = '\n' + new Array(indent + 1).join(' ');

  if (node.properties.length > 0) {
    // Insert comma.
    const last = node.properties[node.properties.length - 1];
    recorder.insertRight(last.start.offset + last.text.replace(/\s+$/, '').length, ',');
  }

  recorder.insertLeft(
    node.end.offset - 1,
    '  '
    + `"${propertyName}": ${JSON.stringify(value, null, 2).replace(/\n/g, indentStr)}`
    + indentStr.slice(0, -2),
  );
}

function addPackageToMonorepo(options: Schema, path: string): Rule {
  return (tree: Tree) => {
    const collectionJsonContent = tree.read('/.monorepo.json');
    if (!collectionJsonContent) {
      throw new Error('Could not find monorepo.json');
    }
    const collectionJsonAst = parseJsonAst(collectionJsonContent.toString('utf-8'));
    if (collectionJsonAst.kind !== 'object') {
      throw new Error('Invalid monorepo content.');
    }

    const packages = collectionJsonAst.properties.find(x => x.key.value == 'packages');
    if (!packages) {
      throw new Error('Cannot find packages key in monorepo.');
    }
    if (packages.value.kind != 'object') {
      throw new Error('Invalid packages key.');
    }

    const readmeUrl = `https://github.com/angular/angular-cli/blob/master/${path}/README.md`;

    const recorder = tree.beginUpdate('/.monorepo.json');
    appendPropertyInAstObject(
      recorder,
      packages.value,
      options.name,
      {
        name: options.displayName,
        links: [{ label: 'README', url: readmeUrl }],
        version: '0.0.1',
        hash: '',
      },
    );
    tree.commitUpdate(recorder);
  };
}


export default function (options: Schema): Rule {
  const path = 'packages/'
    + options.name
             .replace(/^@/, '')
             .replace(/-/g, '_');

  // Verify if we need to create a full project, or just add a new schematic.
  const source = apply(url('./project-files'), [
    template({
      ...options as object,
      dot: '.',
      path,
    }),
  ]);

  return chain([
    mergeWith(source),
    addPackageToMonorepo(options, path),
  ]);
}
