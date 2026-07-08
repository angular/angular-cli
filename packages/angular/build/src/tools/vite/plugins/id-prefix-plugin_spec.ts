/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createTransformer } from './id-prefix-plugin';

describe('createTransformer', () => {
  it('should strip the prefix from every occurrence on a single (minified) line', () => {
    const transform = createTransformer('/', [
      '@angular/common',
      '@angular/common/http',
      '@angular/core',
      '@angular/router',
    ]);

    const minified =
      'import{a}from"/@id/@angular/common/http";' +
      'import{b}from"/@id/@angular/router";' +
      'import{c}from"/@id/@angular/core";';

    expect(transform(minified)).toBe(
      'import{a}from"@angular/common/http";' +
        'import{b}from"@angular/router";' +
        'import{c}from"@angular/core";',
    );
  });

  it('should strip the prefix from an external with a deep import path', () => {
    const transform = createTransformer('/', ['@angular/common']);

    expect(transform('import{h}from"/@id/@angular/common/http";')).toBe(
      'import{h}from"@angular/common/http";',
    );
  });

  it('should strip the prefix when a non-root base is configured', () => {
    const transform = createTransformer('/app/', ['@angular/router']);

    expect(transform('import{r}from"/app/@id/@angular/router";')).toBe(
      'import{r}from"@angular/router";',
    );
  });

  it('should strip the prefix from multi-line (unminified) code', () => {
    const transform = createTransformer('/', ['@angular/common', '@angular/router']);

    const code =
      'import { CommonModule } from "/@id/@angular/common";\n' +
      'import { Router } from "/@id/@angular/router";\n';

    expect(transform(code)).toBe(
      'import { CommonModule } from "@angular/common";\n' +
        'import { Router } from "@angular/router";\n',
    );
  });

  it('should not modify imports that are not configured externals', () => {
    const transform = createTransformer('/', ['@angular/router']);

    const code = 'import{x}from"/@id/some-other-package";';
    expect(transform(code)).toBe(code);
  });
});
