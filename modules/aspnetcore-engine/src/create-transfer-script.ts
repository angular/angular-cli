/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/** @deprecated use `@nguniversal/common` instead. */
export function createTransferScript(transferData: Object): string {
  return `<script>window['TRANSFER_CACHE'] = ${JSON.stringify(transferData)};</script>`;
}
