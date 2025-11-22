/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { LIST_SCHEMATICS_TOOL } from './list-schematics';
import { RUN_SCHEMATIC_TOOL } from './run-schematic';

export { LIST_SCHEMATICS_TOOL, RUN_SCHEMATIC_TOOL };
export const SCHEMATICS_TOOLS = [LIST_SCHEMATICS_TOOL, RUN_SCHEMATIC_TOOL] as const;
