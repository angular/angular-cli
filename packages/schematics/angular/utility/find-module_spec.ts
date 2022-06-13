/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree, Tree } from '@angular-devkit/schematics';
import { ModuleOptions, buildRelativePath, findModule, findModuleFromOptions } from './find-module';

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

      expect(() => findModule(host, 'foo/src/app/bar')).toThrowError(
        /More than one module matches/,
      );
    });

    it('should throw if only routing modules were found', () => {
      host = new EmptyTree();
      host.create('/foo/src/app/anything-routing.module.ts', 'anything routing module');

      expect(() => findModule(host, 'foo/src/app/anything-routing')).toThrowError(
        /Could not find a non Routing NgModule/,
      );
    });

    it('should throw if two modules found', () => {
      host = new EmptyTree();
      expect(() => findModule(host, 'foo/src/app/bar')).toThrowError(/Could not find an NgModule/);
    });

    it('should accept custom ext for module', () => {
      const host = new EmptyTree();
      const modulePath = '/foo/src/app/app_module.ts';
      host.create(modulePath, 'app module');
      // Should find module if given a custom ext
      const foundModule = findModule(host, 'foo/src/app/bar', '_module.ts');
      expect(foundModule).toBe(modulePath);
      // Should not find module if using default ext
      expect(() => findModule(host, 'foo/src/app/bar')).toThrowError(/Could not find an NgModule/);
    });

    it('should not find module if ext is invalid', () => {
      expect(() => findModule(host, 'foo/src/app/bar', '-module.ts')).toThrowError(
        /Could not find an NgModule/,
      );
      expect(() => findModule(host, 'foo/src/app/bar', '_module.ts')).toThrowError(
        /Could not find an NgModule/,
      );
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
      const modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toEqual('/projects/my-proj/src/app.module.ts');
    });

    it('should find a module when name has underscore', () => {
      tree.create('/projects/my-proj/src/feature_module/app_test.module.ts', '');
      options.path = '/projects/my-proj/src';
      options.name = 'feature_module/new_component';
      const modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toEqual('/projects/my-proj/src/feature_module/app_test.module.ts');
    });

    it('should find a module when name has uppercase', () => {
      tree.create('/projects/my-proj/src/featureModule/appTest.module.ts', '');
      options.path = '/projects/my-proj/src';
      options.name = 'featureModule/newComponent';
      const modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toEqual('/projects/my-proj/src/featureModule/appTest.module.ts');
    });

    it('should find a module if flat is true', () => {
      tree.create('/projects/my-proj/src/module/app_test.module.ts', '');
      options.path = '/projects/my-proj/src';
      options.flat = true;
      options.name = '/module/directive';
      const modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toEqual('/projects/my-proj/src/module/app_test.module.ts');
    });

    it('should find a module in a sub dir', () => {
      tree.create('/projects/my-proj/src/admin/foo.module.ts', '');
      options.name = 'other/test';
      options.module = 'admin/foo';
      options.path = '/projects/my-proj/src';
      const modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toEqual('/projects/my-proj/src/admin/foo.module.ts');
    });

    it('should find a module in a sub dir (2)', () => {
      tree.create('/projects/my-proj/src/admin/foo.module.ts', '');
      options.name = 'admin/hello';
      options.module = 'foo';
      options.path = '/projects/my-proj/src';
      const modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toEqual('/projects/my-proj/src/admin/foo.module.ts');
    });

    it('should find a module using custom ext', () => {
      tree.create('/projects/my-proj/src/app_module.ts', '');
      options.module = 'app';
      options.path = '/projects/my-proj/src';
      options.moduleExt = '_module.ts';
      // Should find module using custom moduleExt
      const modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toBe('/projects/my-proj/src/app_module.ts');
      // Should not find module if using invalid ext
      options.moduleExt = '-module.ts';
      expect(() => findModuleFromOptions(tree, options) as string).toThrowError(
        /Specified module 'app' does not exist/,
      );
      // Should not find module if using default ext
      options.moduleExt = undefined; // use default ext
      expect(() => findModuleFromOptions(tree, options) as string).toThrowError(
        /Specified module 'app' does not exist/,
      );
    });

    it('should ignore custom ext if module or ${module}.ts exists', () => {
      tree.create('/projects/my-proj/src/app.module.ts', '');
      options.path = '/projects/my-proj/src';
      options.moduleExt = '_module.ts';
      let modPath;

      // moduleExt ignored because exact path is found
      options.module = 'app.module.ts';
      modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toBe('/projects/my-proj/src/app.module.ts');

      // moduleExt ignored because module + .ts is found
      options.module = 'app.module';
      modPath = findModuleFromOptions(tree, options) as string;
      expect(modPath).toBe('/projects/my-proj/src/app.module.ts');
    });
  });

  describe('buildRelativePath', () => {
    it('works', () => {
      expect(buildRelativePath('/test/module', '/test/service')).toEqual('./service');
      expect(buildRelativePath('/test/module', '/other/service')).toEqual('../other/service');
      expect(buildRelativePath('/module', '/test/service')).toEqual('./test/service');
      expect(buildRelativePath('/test/service', '/module')).toEqual('../module');
    });
  });
});
