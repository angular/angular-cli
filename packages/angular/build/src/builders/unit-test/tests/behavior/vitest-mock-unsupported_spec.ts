import { execute } from '../../index';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Behavior: "Vitest mocking unsupported"', () => {
    beforeEach(() => {
      setupApplicationTarget(harness);
    });

    it('should fail when vi.mock is used', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      harness.writeFile(
        'src/app/mock-throw.spec.ts',
        `
        import { vi } from 'vitest';
        vi.mock('./something', () => ({}));
      `,
      );

      // Overwrite default to avoid noise
      harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';
        describe('Ignored', () => { it('pass', () => expect(true).toBe(true)); });
      `,
      );

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
    });
  });
});
