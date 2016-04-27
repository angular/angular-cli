import {
  async,
  beforeEachProviders,
  it,
  iit,
  describe,
  ddescribe,
  expect,
  inject
} from '@angular/core/testing';
import { provide } from '@angular/core';
import { <%= classifiedModuleName %>Service } from './<%= dasherizedModuleName %>.service';

describe('<%= classifiedModuleName %> Service', () => {

  beforeEachProviders(() => [<%= classifiedModuleName %>Service]);

  it('should ...', inject([<%= classifiedModuleName %>Service], (service: <%= classifiedModuleName %>Service) => {

  }));

});
