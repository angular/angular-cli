/* tslint:disable:no-unused-variable */

import { TestBed, async } from '@angular/core/testing';
import { <%= classifiedModuleName %> } from './<%= dasherizedModuleName %>.directive';

describe('Directive: <%= classifiedModuleName %>', () => {
  it('should create an instance', () => {
    let directive = new <%= classifiedModuleName %>Directive();
    expect(directive).toBeTruthy();
  });
});
