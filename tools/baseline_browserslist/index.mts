/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { generateBrowserslist } from './generate_browserslist.mjs';

const [baselineDate] = process.argv.slice(2);
const browserslist = generateBrowserslist(baselineDate);

// eslint-disable-next-line no-console
console.log(browserslist);
