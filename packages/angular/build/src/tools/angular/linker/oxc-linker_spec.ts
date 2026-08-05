/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { linkWithOxc } from './oxc-linker';

describe('linkWithOxc', () => {
  it('should not modify code that does not need linking', () => {
    const input = 'const x = 1;';
    const result = linkWithOxc('test.js', input);
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

    const result = linkWithOxc('test.js', input);
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

    const result = linkWithOxc('test.js', input);
    expect(result.code).toContain('i0.ɵɵdefineComponent');
    expect(result.code).not.toContain('i0.ɵɵngDeclareComponent');
  });

  it('should generate a sourcemap when sourcemap option is enabled', () => {
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

    const result = linkWithOxc('test.js', input, { sourcemap: true });
    expect(result.map).toBeDefined();
    const parsedMap = JSON.parse(result.map as string);
    expect(parsedMap.version).toBe(3);
    expect(parsedMap.sources).toContain('test.js');
  });

  it('should remap with input sourcemap when sourcemap option is enabled and inputMap is present', () => {
    const inputMap = {
      version: 3,
      sources: ['original.ts'],
      sourcesContent: ['// original content'],
      mappings: 'AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA;AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(inputMap)).toString('base64');
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
      //# sourceMappingURL=data:application/json;base64,${base64Map}
    `;

    const result = linkWithOxc('test.js', input, { sourcemap: true });
    expect(result.map).toBeDefined();
    const parsedMap = JSON.parse(result.map as string);
    expect(parsedMap.version).toBe(3);
    expect(parsedMap.sources).toContain('original.ts');
  });
});
