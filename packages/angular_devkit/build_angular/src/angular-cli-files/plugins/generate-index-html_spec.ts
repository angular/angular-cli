/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { generateIndexHtml } from './generate-index-html';

describe('index-html-webpack-plugin', () => {

  it('can generate index.html', () => {

    const source = generateIndexHtml({
      input: 'index.html',
      inputContent: '<html><head></head><body></body></html>',
      baseHref: '/',
      sri: false,
      loadOutputFile: (fileName: string) => '',
      unfilteredSortedFiles: [
        {file: 'a.js', type: 'module'},
        {file: 'b.js', type: 'nomodule'},
        {file: 'c.js', type: 'none'},
      ],
      noModuleFiles: new Set<string>(),
    });

    const html = source.source();

    expect(html).toContain('<script src="a.js" type="module"></script>');
    expect(html).toContain('<script src="b.js" nomodule></script>');
    expect(html).toContain('<script src="c.js"></script>');

  });

});
