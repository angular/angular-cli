/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path } from '@angular-devkit/core';
import { EmptyTree, Tree } from '@angular-devkit/schematics';
import { ModuleOptions, findModule, findModuleFromOptions } from './find-module';


describe('find-module', () => {
  describe('findModule', () => {

    let host: Tree;
    const modulePath = '/foo/src/app/app.module.ts';
    beforeEach(() => {
      host = new EmptyTree();
      host.create(modulePath, 'app module');
    });

    it('should find a module', () => {
      const foundModule = findModule(host, 'foo/src/app/bar');
      expect(foundModule).toEqual(modulePath);
    });

    it('should not find a module in another sub dir', () => {
      host.create('/foo/src/app/buzz/buzz.module.ts', 'app module');
      const foundModule = findModule(host, 'foo/src/app/bar');
      expect(foundModule).toEqual(modulePath);
    });

    it('should ignore routing modules', () => {
      host.create('/foo/src/app/app-routing.module.ts', 'app module');
      const foundModule = findModule(host, 'foo/src/app/bar');
      expect(foundModule).toEqual(modulePath);
    });

    it('should work with weird paths', () => {
      host.create('/foo/src/app/app-routing.module.ts', 'app module');
      const foundModule = findModule(host, 'foo//src//app/bar/');
      expect(foundModule).toEqual(modulePath);
    });

    it('should throw if no modules found', () => {
      host.create('/foo/src/app/oops.module.ts', 'app module');
      try {
        findModule(host, 'foo/src/app/bar');
        throw new Error('Succeeded, should have failed');
      } catch (err) {
        expect(err.message).toMatch(/More than one module matches/);
      }
    });

    it('should throw if two modules found', () => {
      try {
        host = new EmptyTree();
        findModule(host, 'foo/src/app/bar');
        throw new Error('Succeeded, should have failed');
      } catch (err) {
        expect(err.message).toMatch(/Could not find an NgModule/);
      }
    });
  });

  describe('findModuleFromOptions', () => {
    let tree: Tree;
    let options: ModuleOptions;
    beforeEach(() => {
      tree = new EmptyTree();
      options = { name: 'foo' };
    });

    it('should find a module', () => {
      tree.create('/projects/my-proj/src/app.module.ts', '');
      options.module = 'app.module.ts';
      options.path = '/projects/my-proj/src';
      const modPath = findModuleFromOptions(tree, options);
      expect(modPath).toEqual('/projects/my-proj/src/app.module.ts' as Path);
    });

    it('should find a module in a sub dir', () => {
      tree.create('/projects/my-proj/src/admin/foo.module.ts', '');
      options.name = 'other/test';
      options.module = 'admin/foo';
      options.path = '/projects/my-proj/src';
      const modPath = findModuleFromOptions(tree, options);
      expect(modPath).toEqual('/projects/my-proj/src/admin/foo.module.ts' as Path);
    });
  });
});
