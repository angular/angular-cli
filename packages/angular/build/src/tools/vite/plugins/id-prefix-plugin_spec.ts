/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRemoveIdPrefixPlugin } from './id-prefix-plugin';

/**
 * Runs the plugin's `configResolved` hook against a minimal fake resolved
 * configuration and returns the transform function of the plugin it registers.
 */
function getTransform(externals: string[], base: string): (code: string) => string {
  const plugin = createRemoveIdPrefixPlugin(externals);
  const resolvedConfig = {
    base,
    plugins: [] as { name: string; transform?: (code: string) => string }[],
  };

  (plugin.configResolved as (config: unknown) => void)(resolvedConfig);

  const pushedPlugin = resolvedConfig.plugins[0];
  expect(pushedPlugin?.transform).toBeDefined();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return pushedPlugin.transform!;
}

describe('createRemoveIdPrefixPlugin', () => {
  it('should strip the prefix from every occurrence on a single (minified) line', () => {
    const transform = getTransform(
      ['@angular/common', '@angular/common/http', '@angular/core', '@angular/router'],
      '/',
    );

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
    const transform = getTransform(['@angular/common'], '/');

    expect(transform('import{h}from"/@id/@angular/common/http";')).toBe(
      'import{h}from"@angular/common/http";',
    );
  });

  it('should strip the prefix when a non-root base is configured', () => {
    const transform = getTransform(['@angular/router'], '/app/');

    expect(transform('import{r}from"/app/@id/@angular/router";')).toBe(
      'import{r}from"@angular/router";',
    );
  });

  it('should strip the prefix from multi-line (unminified) code', () => {
    const transform = getTransform(['@angular/common', '@angular/router'], '/');

    const code =
      'import { CommonModule } from "/@id/@angular/common";\n' +
      'import { Router } from "/@id/@angular/router";\n';

    expect(transform(code)).toBe(
      'import { CommonModule } from "@angular/common";\n' +
        'import { Router } from "@angular/router";\n',
    );
  });

  it('should not modify imports that are not configured externals', () => {
    const transform = getTransform(['@angular/router'], '/');

    const code = 'import{x}from"/@id/some-other-package";';
    expect(transform(code)).toBe(code);
  });

  it('should not register a transform when there are no externals', () => {
    const plugin = createRemoveIdPrefixPlugin([]);
    const resolvedConfig = { base: '/', plugins: [] };

    (plugin.configResolved as (config: unknown) => void)(resolvedConfig);

    expect(resolvedConfig.plugins).toHaveSize(0);
  });
});
