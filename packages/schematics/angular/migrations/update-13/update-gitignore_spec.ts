/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to update "gitignore".', () => {
  const schematicName = 'update-gitignore';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should not modify '.gitignore' if '.angular/cache' is already present.`, async () => {
    const input = tags.stripIndents`
        # dependencies
        /node_modules

        # profiling files
        chrome-profiler-events*.json

        # misc
        /.angular/cache
        /.sass-cache
        /connect.lock
        /coverage

        # System Files
        .DS_Store
        Thumbs.db
    `;

    tree.create('.gitignore', input);
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('.gitignore')).toBe(input);
  });

  it(`should insert '.angular/cache' in '# misc' section when it exists.`, async () => {
    const input = tags.stripIndents`
        # dependencies
        /node_modules

        # profiling files
        chrome-profiler-events*.json

        # misc
        /.sass-cache
        /connect.lock
        /coverage

        # System Files
        .DS_Store
        Thumbs.db
    `;

    const output = tags.stripIndents`
        # dependencies
        /node_modules

        # profiling files
        chrome-profiler-events*.json

        # misc
        /.angular/cache
        /.sass-cache
        /connect.lock
        /coverage

        # System Files
        .DS_Store
        Thumbs.db
    `;

    tree.create('.gitignore', input);
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('.gitignore')).toBe(output);
  });

  it(`should insert '.angular/cache' at the top when '# misc' section does not exist.`, async () => {
    const input = tags.stripIndents`
        # dependencies
        /node_modules

        # profiling files
        chrome-profiler-events*.json

        # miscs
        /connect.lock
        /coverage

        # System Files
        .DS_Store
        Thumbs.db
    `;

    const output = tags.stripIndents`
        /.angular/cache
        # dependencies
        /node_modules

        # profiling files
        chrome-profiler-events*.json

        # miscs
        /connect.lock
        /coverage

        # System Files
        .DS_Store
        Thumbs.db
    `;

    tree.create('.gitignore', input);
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.readContent('.gitignore')).toBe(output);
  });
});
