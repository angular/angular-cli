import { TestBed, inject } from '@angular/core/testing';

import { <%= classifiedModuleName %>Service } from './<%= dasherizedModuleName %>.service';

describe('<%= classifiedModuleName %>Service', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [<%= classifiedModuleName %>Service]
    });
  });

  it('should be created', inject([<%= classifiedModuleName %>Service], (service: <%= classifiedModuleName %>Service) => {
    expect(service).toBeTruthy();
  }));
});
