/* tslint:disable:no-unused-variable */

import {
  beforeEach, beforeEachProviders,
  describe, xdescribe,
  expect, it, xit,
  async, inject
} from '@angular/core/testing';
import { <%= classifiedModuleName %>Pipe } from './<%= dasherizedModuleName %>.pipe';

describe('Pipe: <%= classifiedModuleName %>', () => {
  it('create an instance', () => {
    let pipe = new <%= classifiedModuleName %>Pipe();
    expect(pipe).toBeTruthy();
  });
});
