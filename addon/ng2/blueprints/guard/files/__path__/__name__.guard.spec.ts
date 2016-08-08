/* tslint:disable:no-unused-variable */

import { addProviders, async, inject } from '@angular/core/testing';
import { <%= classifiedModuleName %>Guard } from './<%= dasherizedModuleName %>.guard';

describe('Guard: <%= classifiedModuleName %>', () => {
  beforeEach(() => {
    addProviders([<%= classifiedModuleName %>Guard]);
  });

  it('should ...',
    inject([<%= classifiedModuleName %>Guard],
      (guard: <%= classifiedModuleName %>Guard) => {
        expect(guard).toBeTruthy();
      }));
});
