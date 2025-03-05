/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: "browser builder external dependencies"', () => {
    beforeEach(async () => {
      setupTarget(harness, {
        externalDependencies: ['rxjs', 'rxjs/operators'],
      });

      await harness.writeFile(
        'src/main.ts',
        `
        import { BehaviorSubject } from 'rxjs';
        import { map } from 'rxjs/operators';

        const subject = new BehaviorSubject<string>('hello');
        console.log(subject.value);

        subject.pipe(map((val) => val + ' there')).subscribe(console.log);
      `,
      );
    });

    it('respects import specifiers for externalized dependencies', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'main.js');

      expect(result?.success).toBeTrue();

      const text = await response?.text();
      expect(text).toContain(`import { BehaviorSubject } from "rxjs";`);
      expect(text).toContain(`import { map } from "rxjs/operators";`);
    });

    it('respects import specifiers when using baseHref with trailing slash', async () => {
      setupTarget(harness, {
        externalDependencies: ['rxjs'],
        baseHref: '/test/',
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'main.js');

      expect(result?.success).toBeTrue();

      const text = await response?.text();
      expect(text).toContain(`import { BehaviorSubject } from "rxjs";`);
      expect(text).toContain(`import { map } from "rxjs/operators";`);
    });

    it('respects import specifiers when using baseHref without trailing slash', async () => {
      setupTarget(harness, {
        externalDependencies: ['rxjs/*'],
        baseHref: '/test',
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, 'main.js');

      expect(result?.success).toBeTrue();

      const text = await response?.text();
      expect(text).toContain(`import { BehaviorSubject } from "rxjs";`);
      expect(text).toContain(`import { map } from "rxjs/operators";`);
    });

    // TODO: Enable when Vite has a custom logger setup to redirect logging into the builder system
    xit('does not show pre-transform errors in the console for external dependencies', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await executeOnceAndFetch(harness, 'main.js');

      expect(result?.success).toBeTrue();
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching('Pre-transform error'),
        }),
      );
    });
  });
});
