/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 *
 * This file is used to bootstrap the CLI process by dynamically importing the main initialization code.
 * This is done to allow the main bin file (`ng`) to remain CommonJS so that older versions of Node.js
 * can be checked and validated prior to the execution of the CLI. This separate bootstrap file is
 * needed to allow the use of a dynamic import expression without crashing older versions of Node.js that
 * do not support dynamic import expressions and would otherwise throw a syntax error. This bootstrap file
 * is required from the main bin file only after the Node.js version is determined to be in the supported
 * range.
 */

import('../lib/init.js');
