import { TestBed, inject } from '@angular/core/testing';

import { <%= classify(name) %>Service } from './<%= dasherize(name) %>.service';

describe('<%= classify(name) %>Service', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [<%= classify(name) %>Service]
    });
  });

  it('should be created', inject([<%= classify(name) %>Service], (service: <%= classify(name) %>Service) => {
    expect(service).toBeTruthy();
  }));
});
