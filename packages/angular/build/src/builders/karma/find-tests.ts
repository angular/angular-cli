/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

// This file is a compatibility layer that re-exports the test discovery logic from its new location.
// This is necessary to avoid breaking the Karma builder, which still depends on this file.
export { findTests, getTestEntrypoints } from '../unit-test/test-discovery';
