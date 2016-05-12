/* tslint:disable:no-unused-variable */

import { addProviders, async, inject } from '@angular/core/testing';
import { <%= classifiedModuleName %>Service } from './<%= dasherizedModuleName %>.service';

describe('Service: <%= classifiedModuleName %>', () => {
  beforeEach(() => {
    addProviders([<%= classifiedModuleName %>Service]);
  });

  it('should ...',
    inject([<%= classifiedModuleName %>Service],
      (service: <%= classifiedModuleName %>Service) => {
        expect(service).toBeTruthy();
      }));
});
