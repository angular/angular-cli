/* tslint:disable:no-unused-variable */

import { TestBed, async } from '@angular/core/testing';
import { <%= classifiedModuleName %>Directive } from './<%= dasherizedModuleName %>.directive';

describe('<%= classifiedModuleName %>Directive', () => {
  it('should create an instance', () => {
    let directive = new <%= classifiedModuleName %>Directive();
    expect(directive).toBeTruthy();
  });
});
