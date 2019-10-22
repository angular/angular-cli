/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as analytics from './analytics';
import * as experimental from './experimental';
import * as json from './json/index';
import * as logging from './logger/index';
import * as ɵterminal from './terminal/index';
import * as workspaces from './workspace';

export * from './exception/exception';
export * from './json/index';
export * from './utils/index';
export * from './virtual-fs/index';

 /** @deprecated since version 8 - Instead use other 3rd party libraries like `colors` and `chalk`. */
export const terminal = ɵterminal;

export {
  analytics,
  experimental,
  json,
  logging,
  workspaces,
};
