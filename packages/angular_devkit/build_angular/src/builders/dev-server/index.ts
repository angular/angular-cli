/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { createBuilder } from '@angular-devkit/architect';
import { Schema as DevServerBuilderOptions } from './schema';
import { DevServerBuilderOutput, serveWebpackBrowser } from './webpack-server';

export { DevServerBuilderOptions, DevServerBuilderOutput, serveWebpackBrowser };
export default createBuilder<DevServerBuilderOptions, DevServerBuilderOutput>(serveWebpackBrowser);
