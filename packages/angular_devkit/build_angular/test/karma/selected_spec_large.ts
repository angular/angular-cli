/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { createArchitect, host, karmaTargetSpec } from '../utils';

describe('Karma Builder', () => {
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(() => host.restore().toPromise());

  describe('with include option', () => {
    it('should fail when include does not match any files', async () => {
      const overrides = {
        include: ['abc.spec.ts', 'def.spec.ts'],
      };
      const run = await architect.scheduleTarget(karmaTargetSpec, overrides);

      await expectAsync(run.result).toBeRejectedWith(
        `Specified patterns: "abc.spec.ts, def.spec.ts" did not match any spec files`,
      );

      await run.stop();
    });

    it('should fail when main test file does not include require.context usage', async () => {
      let lastErrorLogEntry: logging.LogEntry | undefined;
      const logger = new logging.Logger('test');
      logger.subscribe(m => {
        if (m.level === 'error') {
          lastErrorLogEntry = m;
        }
      });

      const mockedRequireContext = '{ keys: () => ({ map: (_a) => { } }) };';
      const regex = /require\.context\(.*/;
      host.replaceInFile('src/test.ts', regex, mockedRequireContext);

      const overrides = {
        include: ['**/*.spec.ts'],
      };

      const run = await architect.scheduleTarget(karmaTargetSpec, overrides, {
        logger,
      });

      await expectAsync(run.result).toBeResolved();

      expect(lastErrorLogEntry && lastErrorLogEntry.message).toContain(
        'const context = require.context',
      );
      expect(lastErrorLogEntry && lastErrorLogEntry.message)
        // tslint:disable-next-line:max-line-length
        .toContain(
          "The 'include' option requires that the 'main' file for tests include the line below:",
        );

      await run.stop();
    });

    [
      {
        test: 'relative path from workspace to spec',
        input: ['src/app/app.component.spec.ts'],
      },
      {
        test: 'relative path from workspace to file',
        input: ['src/app/app.component.ts'],
      },
      {
        test: 'relative path from project root to spec',
        input: ['app/services/test.service.spec.ts'],
      },
      {
        test: 'relative path from project root to file',
        input: ['app/services/test.service.ts'],
      },
      {
        test: 'relative path from workspace to directory',
        input: ['src/app/services'],
      },
      {
        test: 'relative path from project root to directory',
        input: ['app/services'],
      },
      {
        test: 'glob with spec suffix',
        input: ['**/*.pipe.spec.ts', '**/*.pipe.spec.ts', '**/*test.service.spec.ts'],
      },
    ].forEach((options, index) => {
      it(`should work with ${options.test} (${index})`, async () => {
        host.writeMultipleFiles({
          'src/app/services/test.service.spec.ts': `
            describe('TestService', () => {
              it('should succeed', () => {
                expect(true).toBe(true);
              });
            });`,
          'src/app/failing.service.spec.ts': `
            describe('FailingService', () => {
              it('should be ignored', () => {
                expect(true).toBe(false);
              });
            });`,
          'src/app/property.pipe.spec.ts': `
            describe('PropertyPipe', () => {
              it('should succeed', () => {
                expect(true).toBe(true);
              });
            });`,
        });

        const overrides = {
          include: options.input,
        };
        const logger = new logging.Logger('test');
        logger.subscribe(m => {
          if (m.level === 'error') {
            fail(m);
          }
        });
        const run = await architect.scheduleTarget(karmaTargetSpec, overrides, {
          logger,
        });

        await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

        await run.stop();
      });
    });
  });
});
