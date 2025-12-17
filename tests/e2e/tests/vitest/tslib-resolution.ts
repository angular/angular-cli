import { writeFile } from '../../utils/fs';
import { installPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { applyVitestBuilder } from '../../utils/vitest';
import assert from 'node:assert';

export default async function () {
  await applyVitestBuilder();
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');

  // Add a custom decorator to trigger tslib usage
  await writeFile(
    'src/app/custom-decorator.ts',
    `
    export function MyDecorator() {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // do nothing
      };
    }
    `,
  );

  // Add a service that uses the decorator
  await writeFile(
    'src/app/test.service.ts',
    `
    import { Injectable } from '@angular/core';
    import { MyDecorator } from './custom-decorator';

    @Injectable({
      providedIn: 'root'
    })
    export class TestService {
      @MyDecorator()
      myMethod() {
        return true;
      }
    }
    `,
  );

  // Add a test for the service
  await writeFile(
    'src/app/test.service.spec.ts',
    `
    import { TestBed } from '@angular/core/testing';
    import { TestService } from './test.service';

    describe('TestService', () => {
      let service: TestService;

      beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(TestService);
      });

      it('should be created', () => {
        expect(service).toBeTruthy();
      });

      it('myMethod should return true', () => {
        expect(service.myMethod()).toBe(true);
      });
    });
    `,
  );

  const { stdout } = await ng('test', '--no-watch', '--browsers', 'chromiumHeadless');
  assert.match(stdout, /2 passed/, 'Expected 2 tests to pass.');
}
