/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { RefactorReporter } from './refactor-reporter';

describe('RefactorReporter', () => {
  let logger: logging.LoggerApi;
  let reporter: RefactorReporter;

  beforeEach(() => {
    logger = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
    } as unknown as logging.LoggerApi;
    reporter = new RefactorReporter(logger);
  });

  it('should correctly increment scanned and transformed files', () => {
    reporter.incrementScannedFiles();
    reporter.incrementScannedFiles();
    reporter.incrementTransformedFiles();
    reporter.printSummary();

    expect(logger.info).toHaveBeenCalledWith('Jasmine to Vitest Refactoring Summary:');
    expect(logger.info).toHaveBeenCalledWith('- 2 test file(s) scanned.');
    expect(logger.info).toHaveBeenCalledWith('- 1 file(s) transformed.');
    expect(logger.info).toHaveBeenCalledWith('- 1 file(s) skipped (no changes needed).');
  });

  it('should record and count todos by category', () => {
    reporter.recordTodo('pending');
    reporter.recordTodo('spyOnAllFunctions');
    reporter.recordTodo('pending');
    reporter.printSummary();

    expect(logger.warn).toHaveBeenCalledWith('- 3 TODO(s) added for manual review:');
    expect(logger.warn).toHaveBeenCalledWith('  - 2x pending');
    expect(logger.warn).toHaveBeenCalledWith('  - 1x spyOnAllFunctions');
  });

  it('should not print the todos section if none were recorded', () => {
    reporter.printSummary();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
