/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Behavior: barrel imports with async tests', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });
    it('should initialize components imported through a barrel', async () => {
      harness.useTarget('test', { ...BASE_OPTIONS, include: ['src/app/repro/**/*.spec.ts'] });
      await harness.writeFiles({
        'src/app/repro/layout/layout.ts': `
import { Component } from '@angular/core';
@Component({ selector: 'app-layout', template: '<ng-content />' })
export class Layout {}
`,
        'src/app/repro/layout/index.ts': `
export * from './layout';
`,
        'src/app/repro/a/dialog.ts': `
import { Component } from '@angular/core';
import { Layout } from '../layout';
@Component({
  selector: 'app-dialog',
  imports: [Layout],
  template: '<app-layout>dialog</app-layout>',
})
export class Dialog {}
`,
        'src/app/repro/c/page.ts': `
import { Component } from '@angular/core';
import { Layout } from '../layout';
@Component({
  selector: 'app-page',
  imports: [Layout],
  template: '<app-layout>page</app-layout>',
})
export class Page {}
`,
        'src/app/repro/a/dialog.spec.ts': `
import { TestBed } from '@angular/core/testing';
import { Dialog } from './dialog';
describe('a/dialog.spec.ts', () => {
  it('creates', () => {
    TestBed.configureTestingModule({ imports: [Dialog] });
    expect(TestBed.createComponent(Dialog).componentInstance).toBeTruthy();
  });
});
`,
        'src/app/repro/a/dialog-again.spec.ts': `
import { TestBed } from '@angular/core/testing';
import { Dialog } from './dialog';
describe('a/dialog-again.spec.ts', () => {
  it('creates', () => {
    TestBed.configureTestingModule({ imports: [Dialog] });
    expect(TestBed.createComponent(Dialog).componentInstance).toBeTruthy();
  });
});
`,
        'src/app/repro/c/page.spec.ts': `
import { TestBed } from '@angular/core/testing';
import { Page } from './page';
describe('c/page.spec.ts', () => {
  it('creates', () => {
    TestBed.configureTestingModule({ imports: [Page] });
    expect(TestBed.createComponent(Page).componentInstance).toBeTruthy();
  });
});
`,
        'src/app/repro/b/other.spec.ts': `
import { TestBed } from '@angular/core/testing';
import { Layout } from '../layout/layout';
describe('async spec', () => {
  it('creates', async () => {
    TestBed.configureTestingModule({ imports: [Layout] });
    await Promise.resolve();
    expect(TestBed.createComponent(Layout).componentInstance).toBeTruthy();
  });
});
`,
      });
      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
