import {describe, it, expect, beforeEachProviders, inject} from 'angular2/testing';
import {provide} from 'angular2/core';
import {<%= classifiedModuleName %>Service} from './<%= dasherizedModuleName %>.service';

describe('<%= classifiedModuleName %>Service', () => {

  beforeEachProviders(() => [<%= classifiedModuleName %>Service]);

  it('should get all <%= camelizedModuleName %>s', inject([<%= classifiedModuleName %>Service], (<%= camelizedModuleName %>Service:<%= classifiedModuleName %>Service) => {
    <%= camelizedModuleName %>Service.getAll().then(<%= camelizedModuleName %>s => expect(<%= camelizedModuleName %>s.length).toBe(3));
  }));

  it('should get one <%= camelizedModuleName %>', inject([<%= classifiedModuleName %>Service], (<%= camelizedModuleName %>Service:<%= classifiedModuleName %>Service) => {
    <%= camelizedModuleName %>Service.get(1).then(<%= camelizedModuleName %> => expect(<%= camelizedModuleName %>.id).toBe(1));
  }));

});
