/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { format } from 'prettier';
import { transformJasmineToVitest } from './test-file-transformer';
import { RefactorReporter } from './utils/refactor-reporter';

async function expectTransformation(input: string, expected: string): Promise<void> {
  const logger = new logging.NullLogger();
  const reporter = new RefactorReporter(logger);
  const transformed = transformJasmineToVitest('spec.ts', input, reporter);
  const formattedTransformed = await format(transformed, { parser: 'typescript' });
  let formattedExpected = await format(expected, { parser: 'typescript' });
  // Strip blank lines to avoid test failures due to cosmetic differences.
  formattedExpected = formattedExpected.replace(/\n\s*\n/g, '\n');

  expect(formattedTransformed).toBe(formattedExpected);
}

describe('Jasmine to Vitest Transformer - Integration Tests', () => {
  it('should transform a basic component test file', async () => {
    const jasmineCode = `
      import { ComponentFixture, TestBed } from '@angular/core/testing';
      import { MyComponent } from './my.component';
      import { MyService } from './my.service';

      describe('MyComponent', () => {
        let component: MyComponent;
        let fixture: ComponentFixture<MyComponent>;
        let myService: MyService;

        beforeEach(() => {
          TestBed.configureTestingModule({
            declarations: [MyComponent],
            providers: [MyService],
          });

          fixture = TestBed.createComponent(MyComponent);
          component = fixture.componentInstance;
          myService = TestBed.inject(MyService);
          spyOn(myService, 'getValue').and.returnValue('mock value');
        });

        it('should create', () => {
          expect(component).toBeTruthy();
        });

        it('should get value from service on init', () => {
          fixture.detectChanges();
          expect(myService.getValue).toHaveBeenCalled();
          expect(component.value).toBe('mock value');
        });

        it('should handle user click', () => {
          spyOn(window, 'alert');
          const button = fixture.nativeElement.querySelector('button');
          button.click();
          fixture.detectChanges();
          expect(window.alert).toHaveBeenCalledWith('button clicked');
        });

        xit('a skipped test', () => {
          // This test is skipped
        });
      });
    `;

    const vitestCode = `
      import { ComponentFixture, TestBed } from '@angular/core/testing';
      import { MyComponent } from './my.component';
      import { MyService } from './my.service';

      describe('MyComponent', () => {
        let component: MyComponent;
        let fixture: ComponentFixture<MyComponent>;
        let myService: MyService;

        beforeEach(() => {
          TestBed.configureTestingModule({
            declarations: [MyComponent],
            providers: [MyService],
          });

          fixture = TestBed.createComponent(MyComponent);
          component = fixture.componentInstance;
          myService = TestBed.inject(MyService);
          vi.spyOn(myService, 'getValue').mockReturnValue('mock value');
        });

        it('should create', () => {
          expect(component).toBeTruthy();
        });

        it('should get value from service on init', () => {
          fixture.detectChanges();
          expect(myService.getValue).toHaveBeenCalled();
          expect(component.value).toBe('mock value');
        });

        it('should handle user click', () => {
          vi.spyOn(window, 'alert');
          const button = fixture.nativeElement.querySelector('button');
          button.click();
          fixture.detectChanges();
          expect(window.alert).toHaveBeenCalledWith('button clicked');
        });

        it.skip('a skipped test', () => {
          // This test is skipped
        });
      });
    `;

    await expectTransformation(jasmineCode, vitestCode);
  });

  it('should transform a service test with async operations and timer mocks', async () => {
    const jasmineCode = `
      import { TestBed } from '@angular/core/testing';
      import { MyService } from './my.service';

      describe('MyService', () => {
        let service: MyService;

        beforeEach(() => {
          TestBed.configureTestingModule({
            providers: [MyService],
          });
          service = TestBed.inject(MyService);
          jasmine.clock().install();
        });

        afterEach(() => {
          jasmine.clock().uninstall();
        });

        it('should do something async with done', (done) => {
          service.fetchData().then(data => {
            expect(data).toEqual({ value: 'real data' });
            done();
          });
        });

        it('should handle timeouts', () => {
          let value = '';
          setTimeout(() => {
            value = 'done';
          }, 1000);

          jasmine.clock().tick(500);
          expect(value).toBe('');
          jasmine.clock().tick(500);
          expect(value).toBe('done');
        });

        fit('a focused test for async behavior', async () => {
          const promise = Promise.resolve('resolved');
          await expectAsync(promise).toBeResolvedTo('resolved');
        });
      });
    `;

    const vitestCode = `
      import { TestBed } from '@angular/core/testing';
      import { MyService } from './my.service';

      describe('MyService', () => {
        let service: MyService;

        beforeEach(() => {
          TestBed.configureTestingModule({
            providers: [MyService],
          });
          service = TestBed.inject(MyService);
          vi.useFakeTimers();
        });

        afterEach(() => {
          vi.useRealTimers();
        });

        it('should do something async with done', async () => {
          await service.fetchData().then(data => {
            expect(data).toEqual({ value: 'real data' });
          });
        });

        it('should handle timeouts', () => {
          let value = '';
          setTimeout(() => {
            value = 'done';
          }, 1000);

          vi.advanceTimersByTime(500);
          expect(value).toBe('');
          vi.advanceTimersByTime(500);
          expect(value).toBe('done');
        });

        it.only('a focused test for async behavior', async () => {
          const promise = Promise.resolve('resolved');
          await expect(promise).resolves.toEqual('resolved');
        });
      });
    `;

    await expectTransformation(jasmineCode, vitestCode);
  });

  it('should transform a file with complex spies and matchers', async () => {
    const jasmineCode = `
      describe('Complex Scenarios', () => {
        let serviceMock;

        beforeEach(() => {
          serviceMock = jasmine.createSpyObj('MyService', {
            getData: jasmine.any(String),
            process: undefined,
          });
        });

        it('should use asymmetric matchers correctly', () => {
          const result = serviceMock.getData();
          expect(result).toEqual(jasmine.any(String));
          expect({ foo: 'bar', baz: 'qux' }).toEqual(jasmine.objectContaining({ foo: 'bar' }));
        });

        it('should handle array contents checking', () => {
          const arr = [1, 2, 3];
          expect(arr).toEqual(jasmine.arrayWithExactContents([3, 2, 1]));
        });

        it('should handle spy call order', () => {
          const spyA = jasmine.createSpy('spyA');
          const spyB = jasmine.createSpy('spyB');
          spyA();
          spyB();
          expect(spyA).toHaveBeenCalledBefore(spyB);
        });

        it('should handle called once with', () => {
          serviceMock.process('data');
          expect(serviceMock.process).toHaveBeenCalledOnceWith('data');
        });

        it('should handle spy inspection', () => {
            serviceMock.process('arg1', 'arg2');
            expect(serviceMock.process.calls.mostRecent().args).toEqual(['arg1', 'arg2']);
            expect(serviceMock.process.calls.count()).toBe(1);
        });
      });
    `;

    const vitestCode = `
      describe('Complex Scenarios', () => {
        let serviceMock;

        beforeEach(() => {
          serviceMock = {
            getData: vi.fn().mockReturnValue(expect.any(String)),
            process: vi.fn().mockReturnValue(undefined),
          };
        });

        it('should use asymmetric matchers correctly', () => {
          const result = serviceMock.getData();
          expect(result).toEqual(expect.any(String));
          expect({ foo: 'bar', baz: 'qux' }).toEqual(expect.objectContaining({ foo: 'bar' }));
        });

        it('should handle array contents checking', () => {
          const arr = [1, 2, 3];
          expect(arr).toHaveLength(3);
          expect(arr).toEqual(expect.arrayContaining([3, 2, 1]));
        });

        it('should handle spy call order', () => {
          const spyA = vi.fn();
          const spyB = vi.fn();
          spyA();
          spyB();
          expect(Math.min(...vi.mocked(spyA).mock.invocationCallOrder)).toBeLessThan(Math.min(...vi.mocked(spyB).mock.invocationCallOrder));
        });

        it('should handle called once with', () => {
          serviceMock.process('data');
          expect(serviceMock.process).toHaveBeenCalledTimes(1);
          expect(serviceMock.process).toHaveBeenCalledWith('data');
        });

        it('should handle spy inspection', () => {
            serviceMock.process('arg1', 'arg2');
            expect(vi.mocked(serviceMock.process).mock.lastCall).toEqual(['arg1', 'arg2']);
            expect(vi.mocked(serviceMock.process).mock.calls.length).toBe(1);
        });
      });
    `;

    await expectTransformation(jasmineCode, vitestCode);
  });

  it('should handle various other Jasmine APIs', async () => {
    const jasmineCode = `
      describe('Miscellaneous APIs', () => {
        let el: HTMLElement;

        beforeEach(() => {
          el = document.createElement('div');
          jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        });

        it('should handle DOM matchers like toHaveClass', () => {
          el.classList.add('my-class');
          expect(el).withContext('element should have my-class').toHaveClass('my-class');
          el.classList.remove('my-class');
          expect(el).not.toHaveClass('my-class');
        });

        it('should handle pending tests', () => {
          pending('This test is not yet implemented.');
        });

        it('should handle fail()', () => {
          if (true) {
            fail('This should not have happened');
          }
        });

        it('should handle spyOnProperty', () => {
          const obj = { get myProp() { return 'original'; } };
          spyOnProperty(obj, 'myProp', 'get').and.returnValue('mocked');
          expect(obj.myProp).toBe('mocked');
        });

        it('should handle spies throwing errors', () => {
          const spy = jasmine.createSpy('mySpy').and.throwError('Test Error');
          expect(() => spy()).toThrowError('Test Error');
        });
      });
    `;

    const vitestCode = `
      describe('Miscellaneous APIs', () => {
        let el: HTMLElement;

        beforeEach(() => {
          el = document.createElement('div');
          vi.setConfig({ testTimeout: 10000 });
        });

        it('should handle DOM matchers like toHaveClass', () => {
          el.classList.add('my-class');
          expect(el.classList.contains('my-class'), 'element should have my-class').toBe(true);
          el.classList.remove('my-class');
          expect(el.classList.contains('my-class')).toBe(false);
        });

        it.skip('should handle pending tests', () => {
          // TODO: vitest-migration: The pending() function was converted to a skipped test (\`it.skip\`).
          // pending('This test is not yet implemented.');
        });

        it('should handle fail()', () => {
          if (true) {
            throw new Error('This should not have happened');
          }
        });

        it('should handle spyOnProperty', () => {
          const obj = { get myProp() { return 'original'; } };
          vi.spyOn(obj, 'myProp', 'get').mockReturnValue('mocked');
          expect(obj.myProp).toBe('mocked');
        });

        it('should handle spies throwing errors', () => {
          const spy = vi.fn().mockImplementation(() => { throw new Error('Test Error') });
          expect(() => spy()).toThrowError('Test Error');
        });
      });
    `;

    await expectTransformation(jasmineCode, vitestCode);
  });

  it('should add TODOs for unsupported Jasmine features', async () => {
    const jasmineCode = `
      describe('Unsupported Features', () => {
        beforeAll(() => {
          jasmine.addMatchers({
            toBeAwesome: () => ({
              compare: (actual) => ({ pass: actual === 'awesome' })
            })
          });
        });

        it('should use a custom matcher', () => {
          // This will not be transformed, but a TODO should be present.
          expect('awesome').toBeAwesome();
        });

        it('should handle spyOnAllFunctions', () => {
          const myObj = { func1: () => {}, func2: () => {} };
          jasmine.spyOnAllFunctions(myObj);
          myObj.func1();
          expect(myObj.func1).toHaveBeenCalled();
        });

        it('should handle unknown jasmine properties', () => {
          const env = jasmine.getEnv();
          env.configure({ random: false });
        });
      });
    `;

    /* eslint-disable max-len */
    const vitestCode = `
      describe('Unsupported Features', () => {
        beforeAll(() => {
          // TODO: vitest-migration: jasmine.addMatchers is not supported. Please manually migrate to expect.extend().
          jasmine.addMatchers({
            toBeAwesome: () => ({
              compare: (actual) => ({ pass: actual === 'awesome' })
            })
          });
        });

        it('should use a custom matcher', () => {
          // This will not be transformed, but a TODO should be present.
          expect('awesome').toBeAwesome();
        });

        it('should handle spyOnAllFunctions', () => {
          const myObj = { func1: () => {}, func2: () => {} };
          // TODO: vitest-migration: Vitest does not have a direct equivalent for jasmine.spyOnAllFunctions(). Please spy on individual methods manually using vi.spyOn().
          jasmine.spyOnAllFunctions(myObj);
          myObj.func1();
          expect(myObj.func1).toHaveBeenCalled();
        });

        it('should handle unknown jasmine properties', () => {
          // TODO: vitest-migration: Unsupported jasmine property "getEnv" found. Please migrate this manually.
          const env = jasmine.getEnv();
          env.configure({ random: false });
        });
      });
    `;
    /* eslint-enable max-len */

    await expectTransformation(jasmineCode, vitestCode);
  });
});
