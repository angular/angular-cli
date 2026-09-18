import { execute } from '../../index';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
  expectLog,
  expectNoLog,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Behavior: "Vitest Zone initialization"', () => {
    // Zone.js does not current provide fakAsync support for Vitest
    xit('should load Zone and Zone testing support by default', async () => {
      setupApplicationTarget(harness); // Defaults include zone.js

      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';
        import { fakeAsync, tick } from '@angular/core/testing';

        describe('Zone Test', () => {
          it('should have Zone defined', () => {
            expect((globalThis as any).Zone).toBeDefined();
          });

          it('should support fakeAsync', fakeAsync(() => {
            let val = false;
            setTimeout(() => { val = true; }, 100);
            tick(100);
            expect(val).toBeTrue();
          }));
        });
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should NOT load Zone when zoneless (no zone.js in polyfills)', async () => {
      // Setup application target WITHOUT zone.js in polyfills
      setupApplicationTarget(harness, {
        polyfills: [],
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';

        describe('Zoneless Test', () => {
          it('should NOT have Zone defined', () => {
            expect((globalThis as any).Zone).toBeUndefined();
          });
        });
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
    });

    it('should NOT load Zone when test polyfills is empty even if zone.js is in build polyfills', async () => {
      setupApplicationTarget(harness, {
        polyfills: ['zone.js'],
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        polyfills: [],
      });

      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';

        describe('Zoneless Override Test', () => {
          it('should NOT have Zone defined', () => {
            expect((globalThis as any).Zone).toBeUndefined();
          });
        });
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should load Zone when test polyfills includes zone.js even if build polyfills is empty', async () => {
      setupApplicationTarget(harness, {
        polyfills: [],
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        polyfills: ['zone.js'],
      });

      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';

        describe('Zone Forced Test', () => {
          it('should have Zone defined', () => {
            expect((globalThis as any).Zone).toBeDefined();
          });
        });
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should load Zone and emit a deprecation warning when testing a library and zone.js is installed', async () => {
      harness.withBuilderTarget(
        'build',
        async () => ({ success: true }),
        {
          project: 'ng-package.json',
        },
        {
          builderName: '@angular/build:ng-packagr',
        },
      );

      await harness.writeFile(
        'ng-package.json',
        JSON.stringify({
          lib: {
            entryFile: 'src/public-api.ts',
          },
        }),
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['src/app.component.spec.ts'],
      });

      await harness.writeFile(
        'src/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';

        describe('Library Zone Test', () => {
          it('should have Zone defined', () => {
            expect((globalThis as any).Zone).toBeDefined();
          });
        });
      `,
      );

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectLog(logs, /Zone\.js polyfills are being automatically injected/);
    });

    it('should NOT load Zone and not emit warning when testing a library with polyfills: []', async () => {
      harness.withBuilderTarget(
        'build',
        async () => ({ success: true }),
        {
          project: 'ng-package.json',
        },
        {
          builderName: '@angular/build:ng-packagr',
        },
      );

      await harness.writeFile(
        'ng-package.json',
        JSON.stringify({
          lib: {
            entryFile: 'src/public-api.ts',
          },
        }),
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        polyfills: [],
        include: ['src/app.component.spec.ts'],
      });

      await harness.writeFile(
        'src/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';

        describe('Library Zoneless Test', () => {
          it('should NOT have Zone defined', () => {
            expect((globalThis as any).Zone).toBeUndefined();
          });
        });
      `,
      );

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expectNoLog(logs, /Zone\.js polyfills are being automatically injected/);
    });

    it('should load Zone and Zone testing support when testing a library using @angular/build:library and zone.js is installed', async () => {
      harness.withBuilderTarget(
        'build',
        async () => ({ success: true }),
        {
          tsConfig: 'src/tsconfig.lib.json',
          entryPoints: {
            '.': 'src/public-api.ts',
          },
        },
        {
          builderName: '@angular/build:library',
        },
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['src/app.component.spec.ts'],
      });

      await harness.writeFile(
        'src/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';

        describe('Library Zone Test', () => {
          it('should have Zone defined', () => {
            expect((globalThis as any).Zone).toBeDefined();
          });
        });
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
