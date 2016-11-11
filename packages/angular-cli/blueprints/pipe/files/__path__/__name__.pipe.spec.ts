/* tslint:disable:no-unused-variable */

import { TestBed, async } from '@angular/core/testing';
import { <%= classifiedModuleName %>Pipe } from './<%= dasherizedModuleName %>.pipe';

describe('<%= classifiedModuleName %>Pipe', () => {
  describe('.constructor()', () => {
    it('create an instance', () => {
      let pipe = new <%= classifiedModuleName %>Pipe();
      expect(pipe).toBeTruthy();
    });
  });
});
