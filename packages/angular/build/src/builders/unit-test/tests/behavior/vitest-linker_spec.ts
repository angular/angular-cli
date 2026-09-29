/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Behavior: "Vitest Angular Linker"', () => {
    it('should link partially-compiled packages with cross-class references', async () => {
      setupApplicationTarget(harness);

      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile(
        'node_modules/test-lib/package.json',
        JSON.stringify({
          name: 'test-lib',
          version: '1.0.0',
          type: 'module',
          main: './fesm2022/test-lib.mjs',
          types: './index.d.ts',
          exports: {
            '.': {
              types: './index.d.ts',
              default: './fesm2022/test-lib.mjs',
            },
          },
        }),
      );

      await harness.writeFile(
        'node_modules/test-lib/index.d.ts',
        `
        export declare class CascadeSelectSub {}
        export declare class CascadeSelect {}
        `,
      );

      await harness.writeFile(
        'node_modules/test-lib/fesm2022/test-lib.mjs',
        `
        import * as i0 from "@angular/core";
        export class CascadeSelectSub {
          static ɵfac = i0.ɵɵngDeclareFactory({
            minVersion: "12.0.0",
            version: "14.0.0",
            ngImport: i0,
            type: CascadeSelectSub,
            deps: [{ token: CascadeSelect }],
            target: i0.ɵɵFactoryTarget.Component
          });
        }
        export class CascadeSelect {}
        `,
      );

      await harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';
        import { CascadeSelectSub, CascadeSelect } from 'test-lib';

        describe('CascadeSelect test', () => {
          it('loads without ReferenceError', () => {
            expect(CascadeSelectSub).toBeDefined();
            expect(CascadeSelect).toBeDefined();
          });
        });
        `,
      );

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
    });
  });
});
