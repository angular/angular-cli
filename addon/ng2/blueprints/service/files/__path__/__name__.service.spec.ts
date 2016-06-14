/* tslint:disable:no-unused-variable */

import {
  beforeEach, beforeEachProviders,
  describe, ddescribe, xdescribe,
  expect, it, iit, xit,
  async, inject
} from '@angular/core/testing';
import { <%= classifiedModuleName %>Service } from './<%= dasherizedModuleName %>.service';

describe('<%= classifiedModuleName %> Service', () => {
  beforeEachProviders(() => [<%= classifiedModuleName %>Service]);

  it('should ...',
      inject([<%= classifiedModuleName %>Service], (service: <%= classifiedModuleName %>Service) => {
    expect(service).toBeTruthy();
  }));
});
