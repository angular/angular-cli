/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createTestBedInitVirtualFile } from './build-options';

describe('createTestBedInitVirtualFile', () => {
  const projectSourceRoot = '/project/src';

  it('generates a providers import for a normal providersFile', () => {
    const content = createTestBedInitVirtualFile(
      '/project/src/my.providers.ts',
      projectSourceRoot,
      true,
      'none',
      false,
    );

    expect(content).toContain('import providers from "./my.providers";');
  });

  it('embeds the providersFile specifier as a single escaped string literal', () => {
    // A providersFile whose value carries a quote followed by extra source. With raw
    // string interpolation this would terminate the import specifier early and inject
    // the trailing text as executable code into the generated file.
    const malicious = `/project/src/x';globalThis['__pwned']=true;'`;

    const content = createTestBedInitVirtualFile(
      malicious,
      projectSourceRoot,
      true,
      'none',
      false,
    );

    // The entire value stays inside one string literal, so no statement escapes.
    expect(content).toContain(`import providers from "./x';globalThis['__pwned']=true;'";`);
    // The payload must never appear as standalone code.
    expect(content).not.toContain(`import providers from './x';globalThis`);
  });

  it('escapes newlines in the providersFile specifier', () => {
    const withNewline = '/project/src/x\';\nglobalThis["__pwned"]=true;//';

    const content = createTestBedInitVirtualFile(
      withNewline,
      projectSourceRoot,
      true,
      'none',
      false,
    );

    // A raw newline cannot appear inside the generated string literal; it is escaped.
    expect(content).toContain('\\n');
    expect(content).not.toMatch(/import providers from '\.\/x';\n/);
  });
});
