import {
  beforeEachProviders,
  it,
  describe,
  expect,
  inject
} from '@angular/core/testing';
import { <%= classifiedModuleName %>Service } from './<%= dasherizedModuleName %>.service';

describe('<%= classifiedModuleName %> Service', () => {
  beforeEachProviders(() => [<%= classifiedModuleName %>Service]);

  it('should ...',
      inject([<%= classifiedModuleName %>Service], (service: <%= classifiedModuleName %>Service) => {
    expect(service).toBeTruthy();
  }));
});
