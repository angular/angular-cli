/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { RefactorReporter } from './refactor-reporter';

describe('RefactorReporter', () => {
  let logger: logging.LoggerApi;
  let reporter: RefactorReporter;
  let sourceFile: ts.SourceFile;
  let node: ts.Node;

  beforeEach(() => {
    logger = {
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
    } as unknown as logging.LoggerApi;
    reporter = new RefactorReporter(logger);
    sourceFile = ts.createSourceFile('/test.spec.ts', 'statement;', ts.ScriptTarget.Latest);
    node = sourceFile.statements[0];
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
    reporter.recordTodo('pending', sourceFile, node);
    reporter.recordTodo('spyOnAllFunctions', sourceFile, node);
    reporter.recordTodo('pending', sourceFile, node);
    reporter.printSummary();

    expect(logger.warn).toHaveBeenCalledWith('- 3 TODO(s) added for manual review:');
    expect(logger.warn).toHaveBeenCalledWith('  - 2x pending');
    expect(logger.warn).toHaveBeenCalledWith('  - 1x spyOnAllFunctions');
  });

  it('should not print the todos section if none were recorded', () => {
    reporter.printSummary();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should generate a markdown report with TODOs', () => {
    reporter.incrementScannedFiles();
    reporter.recordTodo('pending', sourceFile, node);

    const report = reporter.generateReportContent();

    expect(report).toContain('# Jasmine to Vitest Refactoring Report');
    expect(report).toContain('## Summary');
    expect(report).toContain('|                   | Count |');
    expect(report).toContain('|:------------------|------:|');
    expect(report).toContain('| Files Scanned     |     1 |');
    expect(report).toContain('| Total TODOs       |     1 |');
    expect(report).toContain('## TODO Overview');
    expect(report).toContain('| Category | Count |');
    expect(report).toContain('|:---------|------:|');
    expect(report).toContain('| pending  |     1 |');
    expect(report).toContain('## Files Requiring Manual Attention');
    expect(report).toContain('### [`test.spec.ts`](./test.spec.ts)');
    expect(report).toContain('- [L1](./test.spec.ts#L1): pending');
  });
});
