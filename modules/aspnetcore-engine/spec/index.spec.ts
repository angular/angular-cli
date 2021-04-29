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
