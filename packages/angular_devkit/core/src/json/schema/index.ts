/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as javascript from './serializers/javascript';

export * from './registry';
export * from './schema';


export { javascript };

export const serializers = {
  JavascriptSerializer: javascript.JavascriptSerializer,
};
