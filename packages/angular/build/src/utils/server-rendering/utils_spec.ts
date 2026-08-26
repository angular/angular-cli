/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { generateRedirectStaticPage } from './utils';

describe('generateRedirectStaticPage', () => {
  it('escapes the ampersands of a redirect target', () => {
    const page = generateRedirectStaticPage('https://example.com/docs?from=ssg&next=/ssg');

    expect(page).toContain(
      '<meta http-equiv="refresh" content="0; url=https://example.com/docs?from=ssg&amp;next=/ssg">',
    );
    expect(page).toContain(
      '<a href="https://example.com/docs?from=ssg&amp;next=/ssg">' +
        'https://example.com/docs?from=ssg&amp;next=/ssg</a>',
    );
  });

  it('escapes characters which would break out of the attribute or the tag', () => {
    const page = generateRedirectStaticPage(`/"><script>alert('1')</script>`);

    expect(page).not.toContain('<script>');
    expect(page).toContain(
      '<meta http-equiv="refresh" content="0; url=' +
        '/&quot;&gt;&lt;script&gt;alert(&#39;1&#39;)&lt;/script&gt;">',
    );
    expect(page).toContain('<a href="/&quot;&gt;&lt;script&gt;alert(&#39;1&#39;)&lt;/script&gt;">');
  });
});
