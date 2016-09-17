/* tslint:disable:no-unused-variable */

import { TestBed, async } from '@angular/core/testing';
import { <%= classifiedModuleName %>Component } from './<%= dasherizedModuleName %>.component';

describe('Component: <%= classifiedModuleName %>', () => {
  it('should create an instance', () => {
    let component = new <%= classifiedModuleName %>Component();
    expect(component).toBeTruthy();
  });
});
