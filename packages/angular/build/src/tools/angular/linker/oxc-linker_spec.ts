/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { transform } from '../../oxc/oxc-transform';

describe('oxc-linker', () => {
  it('should not modify code that does not need linking', () => {
    const input = 'const x = 1;';
    const result = transform('test.js', input, { link: true, advancedOptimizations: false });
    expect(result.code).toBe(input);
    expect(result.map).toBeUndefined();
  });

  it('should link a partial directive declaration', () => {
    const input = `
      import * as i0 from "@angular/core";
      export class MyDirective {}
      MyDirective.ɵdir = i0.ɵɵngDeclareDirective({
        minVersion: "12.0.0",
        version: "14.0.0",
        ngImport: i0,
        type: MyDirective,
        selector: "[my-dir]"
      });
    `;

    const result = transform('test.js', input, { link: true, advancedOptimizations: false });
    expect(result.code).toContain('i0.ɵɵdefineDirective');
    expect(result.code).not.toContain('i0.ɵɵngDeclareDirective');
  });

  it('should link a partial component declaration', () => {
    const input = `
      import * as i0 from "@angular/core";
      export class MyComponent {}
      MyComponent.ɵcmp = i0.ɵɵngDeclareComponent({
        minVersion: "12.0.0",
        version: "14.0.0",
        ngImport: i0,
        type: MyComponent,
        isStandalone: true,
        selector: "my-cmp",
        template: "<span>Hello</span>"
      });
    `;

    const result = transform('test.js', input, { link: true, advancedOptimizations: false });
    expect(result.code).toContain('i0.ɵɵdefineComponent');
    expect(result.code).not.toContain('i0.ɵɵngDeclareComponent');
  });

  it('should generate a decoded sourcemap when sourcemap option is enabled', () => {
    const input = `
      import * as i0 from "@angular/core";
      export class MyDirective {}
      MyDirective.ɵdir = i0.ɵɵngDeclareDirective({
        minVersion: "12.0.0",
        version: "14.0.0",
        ngImport: i0,
        type: MyDirective,
        selector: "[my-dir]"
      });
    `;

    const result = transform('test.js', input, {
      link: true,
      advancedOptimizations: false,
      sourcemap: true,
    });
    expect(result.map).toBeDefined();
    expect(result.map?.version).toBe(3);
    expect(result.map?.sources).toContain('test.js');
  });
});
