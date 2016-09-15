/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { <%= classifiedModuleName %>Service } from './<%= dasherizedModuleName %>.service';

describe('Service: <%= classifiedModuleName %>', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [<%= classifiedModuleName %>Service]
    });
  });

  it('should ...', inject([<%= classifiedModuleName %>Service], (service: <%= classifiedModuleName %>Service) => {
    expect(service).toBeTruthy();
  }));
});
