/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// eslint-disable-next-line import/no-unassigned-import
import 'zone.js';

import { ngAspnetCoreEngine } from '@nguniversal/aspnetcore-engine';
import { MockServerModule } from '../testing/mock.server.module';

describe('ASPNETCore Engine', () => {
  it('should render a basic template', async () => {
    const { html } = await ngAspnetCoreEngine({
      appSelector: '<root></root>',
      request: {
        data: {
          request: 'localhost',
        },
      } as any,
      ngModule: MockServerModule,
    });

    expect(html).toContain('some template');
  });
});
