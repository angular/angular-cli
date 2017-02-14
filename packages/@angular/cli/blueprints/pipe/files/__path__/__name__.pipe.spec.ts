/* tslint:disable:no-unused-variable */

import { TestBed, async } from '@angular/core/testing';
import { <%= classifiedModuleName %>Pipe } from './<%= dasherizedModuleName %>.pipe';

describe('<%= classifiedModuleName %>Pipe', () => {

  let <%= camelizedModuleName %>Pipe: <%= classifiedModuleName %>Pipe;

  it('create an instance', () => {
    <%= camelizedModuleName %>Pipe = new <%= classifiedModuleName %>Pipe();
    expect(<%= camelizedModuleName %>Pipe).toBeTruthy();
  });
});
