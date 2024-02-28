/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { loadEsmModule } from '../load-esm';

export async function htmlRewritingStream(content: string): Promise<{
  rewriter: import('parse5-html-rewriting-stream').RewritingStream;
  transformedContent: () => Promise<string>;
}> {
  const { RewritingStream } = await loadEsmModule<typeof import('parse5-html-rewriting-stream')>(
    'parse5-html-rewriting-stream',
  );
  const rewriter = new RewritingStream();

  return {
    rewriter,
    transformedContent: () =>
      pipeline(Readable.from(content), rewriter, async function (source) {
        const chunks = [];
        for await (const chunk of source) {
          chunks.push(Buffer.from(chunk));
        }

        return Buffer.concat(chunks).toString('utf-8');
      }),
  };
}
