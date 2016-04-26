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
import {<%= classifiedModuleName %>Service} from './<%= dasherizedModuleName %>.service';

describe('<%= classifiedModuleName %> Service', () => {

  beforeEachProviders(() => [<%= classifiedModuleName %>Service]);
  
  it('should ...', inject([<%= classifiedModuleName %>Service], (service: <%= classifiedModuleName %>Service) => {

  }));

});
