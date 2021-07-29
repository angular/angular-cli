/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { TestProjectHost } from '@angular-devkit/architect/testing';
import { getSystemPath, join, normalize } from '@angular-devkit/core';
import { ScriptTarget } from 'typescript';
import { BuildBrowserFeatures } from './build-browser-features';

const workspaceRoot = join(normalize(__dirname), '../../test/build-browser-features/');
const host = new TestProjectHost(workspaceRoot);

describe('BuildBrowserFeatures', () => {
  let workspaceRootSysPath = '';
  beforeEach(async () => {
    await host.initialize().toPromise();
    workspaceRootSysPath = getSystemPath(host.root());
  });

  afterEach(async () => host.restore().toPromise());

  describe('isFeatureSupported', () => {
    it('should be true for es6-module and Safari 10.1', () => {
      host.writeMultipleFiles({
        '.browserslistrc': 'Safari 10.1',
      });

      const buildBrowserFeatures = new BuildBrowserFeatures(workspaceRootSysPath);
      expect(buildBrowserFeatures.isFeatureSupported('es6-module')).toBe(true);
    });

    it('should be false for es6-module and IE9', () => {
      host.writeMultipleFiles({
        '.browserslistrc': 'IE 9',
      });

      const buildBrowserFeatures = new BuildBrowserFeatures(workspaceRootSysPath);
      expect(buildBrowserFeatures.isFeatureSupported('es6-module')).toBe(false);
    });

    it('should be true for es6-module and last 1 chrome version', () => {
      host.writeMultipleFiles({
        '.browserslistrc': 'last 1 chrome version',
      });

      const buildBrowserFeatures = new BuildBrowserFeatures(workspaceRootSysPath);
      expect(buildBrowserFeatures.isFeatureSupported('es6-module')).toBe(true);
    });

    it('should be true for es6-module and Edge 18', () => {
      host.writeMultipleFiles({
        '.browserslistrc': 'Edge 18',
      });

      const buildBrowserFeatures = new BuildBrowserFeatures(workspaceRootSysPath);
      expect(buildBrowserFeatures.isFeatureSupported('es6-module')).toBe(true);
    });
  });
});
