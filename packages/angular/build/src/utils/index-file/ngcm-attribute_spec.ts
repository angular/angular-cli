/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { addNgcmAttribute } from './ngcm-attribute';

describe('addNgcmAttribute', () => {
  it('should add the ngcm attribute to the <body> tag', async () => {
    const result = await addNgcmAttribute(`
      <html>
        <head></head>
        <body><p>hello world!</p></body>
      </html>
    `);

    expect(result).toContain('<body ngcm=""><p>hello world!</p></body>');
  });

  it('should not override an existing ngcm attribute', async () => {
    const result = await addNgcmAttribute(`
      <html>
        <head></head>
        <body ngcm="foo"><p>hello world!</p></body>
      </html>
    `);

    expect(result).toContain('<body ngcm="foo"><p>hello world!</p></body>');
  });
});
