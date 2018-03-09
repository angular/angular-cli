import { TestBed, async, inject } from '@angular/core/testing';

import { <%= classify(name) %>Guard } from './<%= dasherize(name) %>.guard';

describe('<%= classify(name) %>Guard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [<%= classify(name) %>Guard]
    });
  });

  it('should ...', inject([<%= classify(name) %>Guard], (guard: <%= classify(name) %>Guard) => {
    expect(guard).toBeTruthy();
  }));
});
