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
  describe('Behavior: "Vitest shared chunk initialization"', () => {
    // Regression test for https://github.com/angular/angular-cli/issues/33728.
    //
    // Without `disableCodeSplitting`, esbuild hoists a module imported by more than one spec
    // entry point into a shared chunk behind a lazy `__esm` initializer, and a class-field
    // initializer in another chunk reads the exported value as `undefined` under the jsdom
    // runner. All four trigger conditions are required and encoded below:
    //   1. two spec entry points import the shared module (so it lands in a shared chunk);
    //   2. a component in one entry reads the export during class-field initialization;
    //   3. that component's spec file contains an `async` test callback (no `await` needed);
    //   4. zone.js is in the polyfills (the `setupApplicationTarget` default), which downlevels
    //      async and makes esbuild emit the spec entry CommonJS-wrapped.
    //
    // NOTE: the failure this guards against is sensitive to inert content — adding a top-level
    // side effect (even a `console.log`) to the shared or importing module below defused it
    // during reduction. Mirror https://github.com/jonmarozick/ng-shared-chunk-repro when
    // modifying these fixtures.
    it('should provide shared-module exports to class-field initializers in async specs', async () => {
      setupApplicationTarget(harness);

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        splitting: false,
      });

      // Keep the default project's spec deterministic; a third spec entry that does not touch
      // the shared module does not affect the reproduction (verified in a fresh workspace).
      await harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';

        describe('AppComponent placeholder', () => {
            it('runs', () => {
                expect(1 + 1).toBe(2);
            });
        });
      `,
      );

      // The shared `const`. Reached from both spec entry points, so it is hoisted into a chunk
      // shared between them.
      await harness.writeFile(
        'src/environments/env-config.ts',
        `
        export interface DealerConfig {
            dealerId: string;
            clientKey: string;
        }

        export const DEALERS: DealerConfig[] = [
            { dealerId: 'dealer-one', clientKey: 'KEY-ONE' },
            { dealerId: 'dealer-two', clientKey: 'KEY-TWO' },
            { dealerId: 'dealer-three', clientKey: 'KEY-THREE' },
            { dealerId: 'dealer-four', clientKey: 'KEY-FOUR' },
        ];
      `,
      );

      // Reached by both spec entries, so it and env-config.ts land in the shared chunk. Reads the
      // const inside a method — after module initialization — and is the passing control.
      await harness.writeFile(
        'src/app/features/lead-generator/services/lead.service.ts',
        `
        import { Injectable } from '@angular/core';

        import { DEALERS } from '../../../../environments/env-config';

        @Injectable({ providedIn: 'root' })
        export class LeadService {
            resolveClientKey(dealerId: string, clientKey?: string): string {
                return clientKey ?? DEALERS.find((d) => d.dealerId === dealerId)?.clientKey ?? '';
            }
        }
      `,
      );

      await harness.writeFile(
        'src/app/features/lead-generator/services/index.ts',
        `export * from './lead.service';\n`,
      );

      // Spec entry point 1 — the second importer that causes the chunk to be shared at all.
      await harness.writeFile(
        'src/app/features/lead-generator/services/lead.service.spec.ts',
        `
        import { describe, it, expect } from 'vitest';
        import { TestBed } from '@angular/core/testing';

        import { LeadService } from './lead.service';

        describe('LeadService', () => {
            it('reads DEALERS inside a method', () => {
                TestBed.configureTestingModule({ providers: [LeadService] });

                expect(TestBed.inject(LeadService).resolveClientKey('dealer-one')).toBe('KEY-ONE');
            });
        });
      `,
      );

      // In the other chunk; reads the shared export eagerly during class-field initialization.
      await harness.writeFile(
        'src/app/features/lead-generator/lead-generator.container.ts',
        `
        import { Component, inject } from '@angular/core';

        import { LeadService } from './services';
        import { DEALERS, DealerConfig } from '../../../environments/env-config';

        @Component({
            selector: 'app-lead-generator',
            standalone: true,
            template: '',
        })
        export class LeadGeneratorContainer {
            private readonly leadService = inject(LeadService);

            readonly dealers: DealerConfig[] = DEALERS;
            readonly dealerOptions = this.dealers.map((d) => d.dealerId);

            hasService(): boolean {
                return this.leadService != null;
            }
        }
      `,
      );

      // Spec entry point 2 — the failing case without the fix. The `async` is load-bearing:
      // zone.js makes the builder downlevel it, the spec then imports the `__async` helper, and
      // esbuild emits this entry CommonJS-wrapped with the component module behind a lazy
      // `__esm` initializer. No `await` is needed; a synchronous callback hides the defect.
      await harness.writeFile(
        'src/app/features/lead-generator/lead-generator.container.spec.ts',
        `
        import { describe, it, expect } from 'vitest';
        import { TestBed } from '@angular/core/testing';

        import { LeadGeneratorContainer } from './lead-generator.container';

        describe('LeadGeneratorContainer', () => {
            it('reads DEALERS in a class-field initialiser', async () => {
                const fixture = TestBed.createComponent(LeadGeneratorContainer);

                expect(fixture.componentInstance.dealers.length).toBe(4);
            });
        });
      `,
      );

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
    });
  });
});
