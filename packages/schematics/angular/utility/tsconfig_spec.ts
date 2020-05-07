/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree, SchematicContext, Tree, callRule } from '@angular-devkit/schematics';
import { addTsConfigProjectReferences } from './tsconfig';

const SOLUTION_TSCONFIG_PATH = 'tsconfig.json';

describe('addTsConfigProjectReference', () => {
  const context = {
    // tslint:disable-next-line:no-any
    logger: {} as any,
  } as SchematicContext;

  const createTsConfig = (content: object) =>
    tree.create(SOLUTION_TSCONFIG_PATH, JSON.stringify(content, undefined, 2));

  const parseTsConfig = (tree: Tree) =>
    // tslint:disable-next-line:no-non-null-assertion
    JSON.parse(tree.read(SOLUTION_TSCONFIG_PATH)!.toString());

  let tree: Tree;
  beforeEach(() => {
    tree = new EmptyTree();
  });

  it('works when references is an empty array', async () => {
    createTsConfig({
      files: [],
      references: [],
    });

    const result = await callRule(
      addTsConfigProjectReferences(['foo/tsconfig.app.json']),
      tree,
      context,
    )
      .toPromise();

    // tslint:disable-next-line:no-non-null-assertion
    const { references } = parseTsConfig(result);
    expect(references).toEqual([
      { path: './foo/tsconfig.app.json' },
    ]);
  });

  it('works when references contains an element', async () => {
    createTsConfig({
      files: [],
      references: [
        { path: './foo/tsconfig.spec.json' },
      ],
    });

    const result = await callRule(
      addTsConfigProjectReferences(['foo/tsconfig.app.json']),
      tree,
      context,
    )
      .toPromise();

    // tslint:disable-next-line:no-non-null-assertion
    const { references } = parseTsConfig(result);
    expect(references).toEqual([
      { path: './foo/tsconfig.spec.json' },
      { path: './foo/tsconfig.app.json' },
    ]);
  });

  it('works when adding multiple references and contains an element', async () => {
    createTsConfig({
      files: [],
      references: [
        { path: './foo/tsconfig.spec.json' },
      ],
    });

    const result = await callRule(
      addTsConfigProjectReferences([
        'foo/tsconfig.app.json',
        'foo/tsconfig.server.json',
      ]),
      tree,
      context,
    )
      .toPromise();

    // tslint:disable-next-line:no-non-null-assertion
    const { references } = parseTsConfig(result);
    expect(references).toEqual([
      { path: './foo/tsconfig.spec.json' },
      { path: './foo/tsconfig.app.json' },
      { path: './foo/tsconfig.server.json' },
    ]);
  });
});
