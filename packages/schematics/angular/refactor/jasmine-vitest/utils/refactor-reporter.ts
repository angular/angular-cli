/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

export class RefactorReporter {
  private filesScanned = 0;
  private filesTransformed = 0;
  private readonly todos = new Map<string, number>();
  private readonly verboseLogs = new Map<string, string[]>();

  constructor(private logger: logging.LoggerApi) {}

  incrementScannedFiles(): void {
    this.filesScanned++;
  }

  incrementTransformedFiles(): void {
    this.filesTransformed++;
  }

  recordTodo(category: string): void {
    this.todos.set(category, (this.todos.get(category) ?? 0) + 1);
  }

  reportTransformation(sourceFile: ts.SourceFile, node: ts.Node, message: string): void {
    const { line } = ts.getLineAndCharacterOfPosition(
      sourceFile,
      ts.getOriginalNode(node).getStart(),
    );
    const filePath = sourceFile.fileName;

    let logs = this.verboseLogs.get(filePath);
    if (!logs) {
      logs = [];
      this.verboseLogs.set(filePath, logs);
    }
    logs.push(`L${line + 1}: ${message}`);
  }

  printSummary(verbose = false): void {
    if (verbose && this.verboseLogs.size > 0) {
      this.logger.info('Detailed Transformation Log:');
      for (const [filePath, logs] of this.verboseLogs) {
        this.logger.info(`Processing: ${filePath}`);
        logs.forEach((log) => this.logger.info(`  - ${log}`));
      }
      this.logger.info(''); // Add a blank line for separation
    }

    this.logger.info('Jasmine to Vitest Refactoring Summary:');
    this.logger.info(`- ${this.filesScanned} test file(s) scanned.`);
    this.logger.info(`- ${this.filesTransformed} file(s) transformed.`);
    const filesSkipped = this.filesScanned - this.filesTransformed;
    if (filesSkipped > 0) {
      this.logger.info(`- ${filesSkipped} file(s) skipped (no changes needed).`);
    }

    if (this.todos.size > 0) {
      const totalTodos = [...this.todos.values()].reduce((a, b) => a + b, 0);
      this.logger.warn(`- ${totalTodos} TODO(s) added for manual review:`);
      for (const [category, count] of this.todos) {
        this.logger.warn(`  - ${count}x ${category}`);
      }
    }
  }
}
