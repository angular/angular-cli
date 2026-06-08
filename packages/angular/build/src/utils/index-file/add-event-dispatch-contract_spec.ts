/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { addEventDispatchContract } from './add-event-dispatch-contract';

describe('addEventDispatchContract', () => {
  it('should inline event dispatcher script', async () => {
    const result = await addEventDispatchContract(`
      <html>
        <head></head>
        <body>
          <h1>Hello World!</h1>
        </body>
      </html>
    `);

    expect(result).toMatch(
      /<body>\s*<script type="text\/javascript" id="ng-event-dispatch-contract">[\s\S]+<\/script>\s*<h1>/,
    );
  });
});
