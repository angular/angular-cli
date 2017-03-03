import { TestBed, async, inject } from '@angular/core/testing';

import { <%= classifiedModuleName %>Guard } from './<%= dasherizedModuleName %>.guard';

describe('<%= classifiedModuleName %>Guard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [<%= classifiedModuleName %>Guard]
    });
  });

  it('should ...', inject([<%= classifiedModuleName %>Guard], (guard: <%= classifiedModuleName %>Guard) => {
    expect(guard).toBeTruthy();
  }));
});
