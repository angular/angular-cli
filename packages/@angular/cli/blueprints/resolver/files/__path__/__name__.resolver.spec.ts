import { TestBed, inject } from '@angular/core/testing';

import { <%= classifiedModuleName %>Resolver } from './<%= dasherizedModuleName %>.resolver';

describe('<%= classifiedModuleName %>Resolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [<%= classifiedModuleName %>Resolver]
    });
  });

  it('should ...', inject([<%= classifiedModuleName %>Resolver], (resolver: <%= classifiedModuleName %>Resolver) => {
    expect(resolver).toBeTruthy();
  }));
});
