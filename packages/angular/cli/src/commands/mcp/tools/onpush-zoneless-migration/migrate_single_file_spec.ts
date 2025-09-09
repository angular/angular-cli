/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types';
import ts from 'typescript';
import { migrateSingleFile } from './migrate_single_file';

const fakeExtras = {
  sendDebugMessage: jasmine.createSpy(),
  sendNotification: jasmine.createSpy(),
} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe('migrateSingleFile', () => {
  it('should identify test files by extension', async () => {
    const fileName = 'test.spec.ts';
    const sourceFile = ts.createSourceFile(fileName, '', ts.ScriptTarget.ESNext, true);

    const result = await migrateSingleFile(sourceFile, fakeExtras);

    expect(result?.content[0].text).toContain(
      'The test file `test.spec.ts` is not yet configured for zoneless change detection.' +
        ' You need to enable it for the entire test suite and then identify which specific tests fail.',
    );
  });

  it('should identify test files by TestBed import', async () => {
    const fileName = 'test.ts';
    const content = `import { TestBed } from '@angular/core/testing';`;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateSingleFile(sourceFile, fakeExtras);

    expect(result?.content[0].text).toContain(
      'The test file `test.ts` is not yet configured for zoneless change detection.' +
        ' You need to enable it for the entire test suite and then identify which specific tests fail.',
    );
  });

  it('should return unsupported zone usages message if NgZone is used', async () => {
    const fileName = 'app.component.ts';
    const content = `
      import { Component, NgZone } from '@angular/core';

      @Component({
        selector: 'app-root',
        template: 'Hello',
      })
      export class AppComponent {
        constructor(private zone: NgZone) {
          this.zone.onMicrotaskEmpty(() => {});
        }
      }
    `;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateSingleFile(sourceFile, fakeExtras);

    expect(result?.content[0].text).toContain(
      'The component uses NgZone APIs that are incompatible with zoneless applications',
    );
  });

  it('should return null if component already has ChangeDetectionStrategy.OnPush', async () => {
    const fileName = 'app.component.ts';
    const content = `
      import { Component, ChangeDetectionStrategy } from '@angular/core';

      @Component({
        selector: 'app-root',
        template: 'Hello',
        changeDetection: ChangeDetectionStrategy.OnPush,
      })
      export class AppComponent {}
    `;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateSingleFile(sourceFile, fakeExtras);

    expect(result).toBeNull();
  });

  it('should return null if component has ChangeDetectionStrategy.Default', async () => {
    const fileName = 'app.component.ts';
    const content = `
      import { Component, ChangeDetectionStrategy } from '@angular/core';

      @Component({
        selector: 'app-root',
        template: 'Hello',
        changeDetection: ChangeDetectionStrategy.Default,
      })
      export class AppComponent {}
    `;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateSingleFile(sourceFile, fakeExtras);

    expect(result).toBeNull();
  });

  it('should return migration instructions for a component without a change detection strategy', async () => {
    const fileName = 'app.component.ts';
    const content = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-root',
        template: 'Hello',
      })
      export class AppComponent {}
    `;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateSingleFile(sourceFile, fakeExtras);

    expect(result?.content[0].text).toContain(
      'The component does not currently use a change detection strategy, which means it may rely on Zone.js',
    );
  });

  it('should return null for a file that is not a component', async () => {
    const fileName = 'some.service.ts';
    const content = `
      import { Injectable } from '@angular/core';

      @Injectable({ providedIn: 'root' })
      export class SomeService {}
    `;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateSingleFile(sourceFile, fakeExtras);

    expect(result).toBeNull();
  });

  it('should return null for an empty file', async () => {
    const fileName = 'empty.ts';
    const content = ``;
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.ESNext, true);

    const result = await migrateSingleFile(sourceFile, fakeExtras);

    expect(result).toBeNull();
  });
});
