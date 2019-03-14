/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { AngularCompilerPlugin } from '@ngtools/webpack';
import * as path from 'path';
import {
  createWebpackMultiConfig,
} from '../../src/differential-loading/create-webpack-multi-config';

const devkitRoot = (global as any)._DevKitRoot; // tslint:disable-line:no-any
const workspaceRoot = path.join(
  devkitRoot,
  'tests/angular_devkit/build_angular/test-differential-loading/');

const tsConfig = path.join(workspaceRoot, 'tsconfig.test.json');

describe('differential loading webpack config', () => {

  it('will be updated', () => {

    const config = {
      output: {
        filename: '[name].js',
      },
      resolve: {
        mainFields: ['main'],
      },
      entry: {
        'main': 'main.js',
      },
      plugins: [
        new AngularCompilerPlugin({tsConfigPath: tsConfig }),
      ],
    };

    const newConfig = createWebpackMultiConfig(config);

    expect(Array.isArray(newConfig)).toBe(true);
    expect(newConfig.length).toBe(2);
  });
});
