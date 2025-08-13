/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { migrateTestFile } from './migrate_test_file';

describe('migrateTestFile', () => {
  it('should return setup prompt when zoneless is not detected', async () => {
    const fileName = 'test.spec.ts';
    const sourceFile = ts.createSourceFile(fileName, '', ts.ScriptTarget.ESNext, true);

    const result = await migrateTestFile(sourceFile);

    expect(result?.content[0].text).toContain(
      'The test file `test.spec.ts` is not yet configured for zoneless change detection.',
    );
  });

  it('should return null when zoneless is enabled and there are no zonejs apis used', async () => {
    const fileName = 'test.spec.ts';
    const content = `
      import { provideZonelessChangeDetection } from '@angular/core';
      import { TestBed } from '@angular/core/testing';

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
    `;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateTestFile(sourceFile);

    expect(result).toBeNull();
  });

  it('should return fix prompt when zoneless is enabled and provideZoneChangeDetection is used', async () => {
    const fileName = 'test.spec.ts';
    const content = `
      import { provideZonelessChangeDetection, provideZoneChangeDetection } from '@angular/core';
      import { TestBed } from '@angular/core/testing';

      describe('suite', () => {
        beforeEach(() => {
          TestBed.configureTestingModule({
            providers: [provideZonelessChangeDetection()],
          });
        });

        it('zone test', () => {
            TestBed.configureTestingModule({
            providers: [provideZoneChangeDetection()],
          });
        });
      });
    `;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateTestFile(sourceFile);

    expect(result?.content[0].text).toContain(
      'You must refactor these tests to work in a zoneless environment and remove the `provideZoneChangeDetection` calls.',
    );
  });
});
