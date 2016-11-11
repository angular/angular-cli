/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { <%= classifiedModuleName %>Service } from './<%= dasherizedModuleName %>.service';

describe('<%= classifiedModuleName %>Service', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [<%= classifiedModuleName %>Service]
    });
  });

  describe('.constructor()', () => {
    it('should ...',
      inject([<%= classifiedModuleName %>Service], (service: <%= classifiedModuleName %>Service) => {
        expect(service).toBeTruthy();
      }));
  });
});
