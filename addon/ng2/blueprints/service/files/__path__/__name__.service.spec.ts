import {
  beforeEachProviders,
  it,
  iit,
  describe,
  ddescribe,
  expect,
  inject,
  injectAsync
} from 'angular2/testing';
import {provide} from 'angular2/core';
import {<%= classifiedModuleName %>} from './<%= dasherizedModuleName %>.service';

describe('<%= classifiedModuleName %> Service', () => {

  beforeEachProviders(() => [<%= classifiedModuleName %>]);
  
  it('should ...', inject([<%= classifiedModuleName %>], (service: <%= classifiedModuleName %>) => {

  }));

});
