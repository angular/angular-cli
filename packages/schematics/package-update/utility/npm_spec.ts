/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:non-null-operator
import { FileSystemTree, InMemoryFileSystemTreeHost, Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { updatePackageJson } from './npm';


describe('Schematic Update', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/package-update',
    path.join(__dirname, '../collection.json'),
  );
  let inputTree: Tree;

  beforeEach(() => {
    inputTree = new FileSystemTree(new InMemoryFileSystemTreeHost({
      '/package.json': `{
        "dependencies": {
          "@angular/core": "4.0.0",
          "@angular/compiler": "4.0.0",
          "rxjs": "5.0.0"
        }
      }`,
    }));
  });

  it('works with a fixed version', done => {
    debugger;
    const rule = updatePackageJson(['@angular/core', '@angular/compiler'], '4.1.0', false);

    schematicRunner.callRule(rule, inputTree)
      .subscribe(outputTree => {
        const packageJson = JSON.parse(outputTree.read('/package.json') !.toString());

        expect(packageJson.dependencies['@angular/core']).toBe('4.1.0');
        expect(packageJson.dependencies['@angular/compiler']).toBe('4.1.0');
        expect(packageJson.dependencies['rxjs']).toBe('^5.5.5');

        done();
      }, (err) => done.fail(err));
  });

  it('works with a peer dependencies', done => {
    debugger;
    const rule = updatePackageJson(['@angular/compiler'], '4.1.0', false);

    schematicRunner.callRule(rule, inputTree)
                   .subscribe(outputTree => {
                     const packageJson = JSON.parse(outputTree.read('/package.json') !.toString());

                     expect(packageJson.dependencies['@angular/core']).toBe('4.1.0');
                     expect(packageJson.dependencies['@angular/compiler']).toBe('4.1.0');
                     expect(packageJson.dependencies['rxjs']).toBe('^5.5.5');

                     done();
                   }, (err) => done.fail(err));
  });

  it('works with a loose version', done => {
    const rule = updatePackageJson(['@angular/core', '@angular/compiler'], '~4.1.0', true);

    schematicRunner.callRule(rule, inputTree)
      .subscribe(outputTree => {
        const packageJson = JSON.parse(outputTree.read('/package.json') !.toString());

        expect(packageJson.dependencies['@angular/core']).toBe('~4.1.3');
        expect(packageJson.dependencies['@angular/compiler']).toBe('~4.1.3');
        expect(packageJson.dependencies['rxjs']).toBe('^5.5.5');

        done();
      }, (err) => done.fail(err));
  });

  it('fails with an invalid version', done => {
    const rule = updatePackageJson(['@angular/core'], 'babababarbaraann');

    schematicRunner.callRule(rule, inputTree)
      .subscribe(() => done.fail('version should not match.'), () => done());
  });
});
