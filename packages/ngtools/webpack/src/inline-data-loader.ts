/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Compilation, LoaderContext } from 'webpack';

export const InlineAngularResourceSymbol = Symbol.for('@ngtools/webpack[inline-angular-resource]');

export interface CompilationWithInlineAngularResource extends Compilation {
  [InlineAngularResourceSymbol]: string;
}

export default function (
  this: LoaderContext<{ data?: string }> & {
    [InlineAngularResourceSymbol]?: Map<string, string>;
  },
) {
  const callback = this.async();
  const { data } = this.getOptions();
  const userRequest = this._module?.userRequest;
  const inlineAngularResourceSymbol = this[InlineAngularResourceSymbol];

  if (data) {
    callback(undefined, Buffer.from(data, 'base64').toString());
  } else if (inlineAngularResourceSymbol && userRequest) {
    callback(undefined, inlineAngularResourceSymbol.get(userRequest));
  } else {
    const content = (this._compilation as CompilationWithInlineAngularResource)[
      InlineAngularResourceSymbol
    ];
    callback(undefined, content);
  }
}
