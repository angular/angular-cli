/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { browserBuild, createArchitect, host } from '../../testing/test-utils';

describe('Browser Builder font optimization', () => {
  const target = { project: 'app', target: 'build' };
  const overrides = {
    optimization: {
      styles: false,
      fonts: true,
    },
  };

  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    host.replaceInFile(
      '/src/index.html',
      '<head>',
      `<head><link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">`,
    );
  });

  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const { files } = await browserBuild(architect, host, target, overrides);
    const html = await files['index.html'];
    expect(html).not.toContain('href="https://fonts.googleapis.com/css?family=Roboto:300,400,500"');
    expect(html).toContain(`font-family: 'Roboto'`);
  });

  it('should not add woff', async () => {
    const { files } = await browserBuild(architect, host, target, overrides);
    const html = await files['index.html'];
    expect(html).toContain(`format('woff2');`);
    expect(html).not.toContain(`format('woff');`);
  });

  it('should remove comments and line breaks when styles optimization is true', async () => {
    const { files } = await browserBuild(architect, host, target, {
      optimization: {
        styles: true,
        fonts: true,
      },
    });
    const html = await files['index.html'];
    expect(html).not.toContain('/*');
    expect(html).toContain(';font-style:normal;');
  });

  it('should not remove comments and line breaks when styles optimization is false', async () => {
    const { files } = await browserBuild(architect, host, target, {
      optimization: {
        styles: false,
        fonts: true,
      },
    });

    const html = await files['index.html'];
    expect(html).toContain('/*');
    expect(html).toContain(' font-style: normal;\n');
  });
});
