/* tslint:disable:no-unused-variable */

import { addProviders, async, inject } from '@angular/core/testing';
import { <%= classifiedModuleName %> } from './<%= dasherizedModuleName %>.directive';

describe('Directive: <%= classifiedModuleName %>', () => {
  it('should create an instance', () => {
    let directive = new <%= classifiedModuleName %>();
    expect(directive).toBeTruthy();
  });
});
