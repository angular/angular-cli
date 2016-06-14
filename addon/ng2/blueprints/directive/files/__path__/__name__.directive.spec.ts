/* tslint:disable:no-unused-variable */

import {
  beforeEach, beforeEachProviders,
  describe, ddescribe, xdescribe,
  expect, it, iit, xit,
  async, inject
} from '@angular/core/testing';
import { <%= classifiedModuleName %> } from './<%= dasherizedModuleName %>.directive';

describe('<%= classifiedModuleName %> Directive', () => {
  it('should create an instance', () => {
    let directive = new <%= classifiedModuleName %>();
    expect(directive).toBeTruthy();
  });
});
