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
import {provide} from 'angular2/angular2';
import {<%= classifiedModuleName %>} from './<%= dasherizedModuleName %>';


describe('<%= classifiedModuleName %> Service', () => {

  beforeEachProviders(() => []);


  it('should ...', inject([<%= classifiedModuleName %>], (service:<%= classifiedModuleName %>) => {

  }));

});
