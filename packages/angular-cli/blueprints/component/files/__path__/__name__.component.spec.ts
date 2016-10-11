/* tslint:disable:no-unused-variable */

import { TestBed, async } from '@angular/core/testing';
import { <%= classifiedModuleName %>Component } from './<%= dasherizedModuleName %>.component';

describe('Component: <%= classifiedModuleName %>', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        <%= classifiedModuleName %>Component
      ],
    });
  });

  it('should create an instance', async(() => {
    let fixture = TestBed.createComponent(<%= classifiedModuleName %>Component);
    let cmp = fixture.debugElement.componentInstance;
    expect(cmp).toBeTruthy();
  }));
});
