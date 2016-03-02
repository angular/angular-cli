import {
  it,
  iit,
  describe,
  ddescribe,
  expect,
  inject,
  injectAsync,
  TestComponentBuilder,
  beforeEachProviders
} from 'angular2/testing';
import {provide} from 'angular2/core';
import {<%= classifiedModuleName %>} from './<%= dasherizedModuleName %>';


describe('<%= classifiedModuleName %> Service', () => {

  beforeEachProviders(() => [<%= classifiedModuleName %>]);


  it('should ...', inject([<%= classifiedModuleName %>], (service:<%= classifiedModuleName %>) => {

  }));

});
