/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Compilation, LoaderContext } from 'webpack';

export const InlineAngularResourceSymbol = Symbol();

export interface CompilationWithInlineAngularResource extends Compilation {
  [InlineAngularResourceSymbol]: string;
}

export default function (this: LoaderContext<{ data?: string }>) {
  const callback = this.async();
  const { data } = this.getOptions();

  if (data) {
    callback(undefined, Buffer.from(data, 'base64').toString());
  } else {
    const content = (this._compilation as CompilationWithInlineAngularResource)[
      InlineAngularResourceSymbol
    ];
    callback(undefined, content);
  }
}
