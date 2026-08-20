/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { transform } from './oxc-transform';

describe('oxc-transform', () => {
  describe('sourcemaps', () => {
    it('should generate a decoded sourcemap when sourcemap option is enabled', () => {
      const input = 'var result = new SomeClass();';
      const result = transform('test.js', input, { sourcemap: true });

      expect(result.map).toBeDefined();
      expect(result.map?.version).toBe(3);
      expect(result.map?.sources).toContain('test.js');
      expect(result.map?.mappings.length).toBeGreaterThan(0);
    });
  });

  describe('linking and unified passes', () => {
    const componentInput = `
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

    it('should link partial component declarations when link option is enabled', () => {
      const result = transform('test.js', componentInput, { link: true });
      expect(result.code).toContain('i0.ɵɵdefineComponent');
      expect(result.code).not.toContain('i0.ɵɵngDeclareComponent');
    });

    it('should not link partial component declarations when link option is disabled', () => {
      const result = transform('test.js', componentInput, { link: false });
      expect(result.code).not.toContain('i0.ɵɵdefineComponent');
      expect(result.code).toContain('i0.ɵɵngDeclareComponent');
    });

    it('should perform linking and advanced optimizations simultaneously in a single pass', () => {
      const input = `
      import * as i0 from "@angular/core";
      export class MyComponent {
        static create() {
          return new MyComponent();
        }
      }
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

      const result = transform('test.js', input, {
        link: true,
        advancedOptimizations: true,
        topLevelSafeMode: true,
      });
      expect(result.code).toContain('i0.ɵɵdefineComponent');
      expect(result.code).not.toContain('i0.ɵɵngDeclareComponent');
      expect(result.code).toContain('let MyComponent = /*#__PURE__*/ (() => {');
    });
  });
});
