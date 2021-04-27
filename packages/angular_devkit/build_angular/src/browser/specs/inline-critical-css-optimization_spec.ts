/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { browserBuild, createArchitect, host } from '../../test-utils';

describe('Browser Builder inline critical CSS optimization', () => {
  const target = { project: 'app', target: 'build' };
  const overrides = {
    optimization: {
      scripts: false,
      styles: {
        minify: true,
        inlineCritical: true,
      },
      fonts: false,
    },
  };

  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
    host.writeMultipleFiles({
      'src/styles.css': `
        body { color: #000 }
      `,
    });
  });

  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const { files } = await browserBuild(architect, host, target, overrides);
    const html = await files['index.html'];
    expect(html).toContain(`<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">`);
    expect(html).toContain(`body{color:#000;}`);
  });

  it('works with deployUrl', async () => {
    const { files } = await browserBuild(architect, host, target, { ...overrides, deployUrl: 'http://cdn.com/' });
    const html = await files['index.html'];
    expect(html).toContain(`<link rel="stylesheet" href="http://cdn.com/styles.css" media="print" onload="this.media='all'">`);
    expect(html).toContain(`body{color:#000;}`);
  });

  it('should not inline critical css when option is disabled', async () => {
    const { files } = await browserBuild(architect, host, target, { optimization: false });
    const html = await files['index.html'];
    expect(html).toContain(`<link rel="stylesheet" href="styles.css">`);
    expect(html).not.toContain(`body{color:#000;}`);
  });
});
