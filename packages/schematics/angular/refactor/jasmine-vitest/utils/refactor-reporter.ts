/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { TodoCategory } from './todo-notes';

export class RefactorReporter {
  private filesScanned = 0;
  private filesTransformed = 0;
  private readonly todos = new Map<string, number>();
  private readonly verboseLogs = new Map<string, string[]>();
  private readonly fileTodos = new Map<string, { category: TodoCategory; line: number }[]>();

  constructor(private logger: { info(message: string): void; warn(message: string): void }) {}

  get hasTodos(): boolean {
    return this.todos.size > 0;
  }

  incrementScannedFiles(): void {
    this.filesScanned++;
  }

  incrementTransformedFiles(): void {
    this.filesTransformed++;
  }

  recordTodo(category: TodoCategory, sourceFile: ts.SourceFile, node: ts.Node): void {
    this.todos.set(category, (this.todos.get(category) ?? 0) + 1);

    const { line } = ts.getLineAndCharacterOfPosition(
      sourceFile,
      ts.getOriginalNode(node).getStart(sourceFile),
    );
    const filePath = sourceFile.fileName;

    let fileTodos = this.fileTodos.get(filePath);
    if (!fileTodos) {
      fileTodos = [];
      this.fileTodos.set(filePath, fileTodos);
    }
    fileTodos.push({ category, line: line + 1 });
  }

  reportTransformation(sourceFile: ts.SourceFile, node: ts.Node, message: string): void {
    const { line } = ts.getLineAndCharacterOfPosition(
      sourceFile,
      ts.getOriginalNode(node).getStart(sourceFile),
    );
    const filePath = sourceFile.fileName;

    let logs = this.verboseLogs.get(filePath);
    if (!logs) {
      logs = [];
      this.verboseLogs.set(filePath, logs);
    }
    logs.push(`L${line + 1}: ${message}`);
  }

  generateReportContent(): string {
    const lines: string[] = [];
    lines.push('# Jasmine to Vitest Refactoring Report');
    lines.push('');
    lines.push(`Date: ${new Date().toISOString()}`);
    lines.push('');

    const summaryEntries = [
      { label: 'Files Scanned', value: this.filesScanned },
      { label: 'Files Transformed', value: this.filesTransformed },
      { label: 'Files Skipped', value: this.filesScanned - this.filesTransformed },
      { label: 'Total TODOs', value: [...this.todos.values()].reduce((a, b) => a + b, 0) },
    ];

    const firstColPad = Math.max(...summaryEntries.map(({ label }) => label.length));
    const secondColPad = 5;

    lines.push('## Summary');
    lines.push('');
    lines.push(`| ${' '.padEnd(firstColPad)} | ${'Count'.padStart(secondColPad)} |`);
    lines.push(`|:${'-'.repeat(firstColPad + 1)}|${'-'.repeat(secondColPad + 1)}:|`);
    for (const { label, value } of summaryEntries) {
      lines.push(`| ${label.padEnd(firstColPad)} | ${String(value).padStart(secondColPad)} |`);
    }
    lines.push('');

    if (this.todos.size > 0) {
      lines.push('## TODO Overview');
      lines.push('');
      const todoEntries = [...this.todos.entries()];
      const firstColPad = Math.max(
        'Category'.length,
        ...todoEntries.map(([category]) => category.length),
      );
      const secondColPad = 5;

      lines.push(`| ${'Category'.padEnd(firstColPad)} | ${'Count'.padStart(secondColPad)} |`);
      lines.push(`|:${'-'.repeat(firstColPad + 1)}|${'-'.repeat(secondColPad + 1)}:|`);
      for (const [category, count] of todoEntries) {
        lines.push(`| ${category.padEnd(firstColPad)} | ${String(count).padStart(secondColPad)} |`);
      }
      lines.push('');
    }

    if (this.fileTodos.size > 0) {
      lines.push('## Files Requiring Manual Attention');
      lines.push('');
      // Sort files alphabetically
      const sortedFiles = [...this.fileTodos.keys()].sort();

      for (const filePath of sortedFiles) {
        const relativePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        lines.push(`### [\`${relativePath}\`](./${relativePath})`);
        const todos = this.fileTodos.get(filePath);
        if (todos) {
          // Sort todos by line number
          todos.sort((a, b) => a.line - b.line);

          for (const todo of todos) {
            lines.push(`- [L${todo.line}](./${relativePath}#L${todo.line}): ${todo.category}`);
          }
        }
        lines.push('');
      }
    } else {
      lines.push('## No Manual Changes Required');
      lines.push('');
      lines.push('All identified patterns were successfully transformed.');
    }

    return lines.join('\n');
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
