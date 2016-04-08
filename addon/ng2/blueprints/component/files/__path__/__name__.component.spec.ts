import {
  beforeEachProviders,
  describe,
  ddescribe,
  expect,
  iit,
  it,
  inject,
  injectAsync,
  ComponentFixture,
  TestComponentBuilder
} from 'angular2/testing';
import {provide} from 'angular2/core';
import {<%= classifiedModuleName %>Component} from './<%= dasherizedModuleName %>.component';

describe('<%= classifiedModuleName %> Component', () => {

  beforeEachProviders((): any[] => []);


  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(<%= classifiedModuleName %>Component).then((fixture: ComponentFixture) => {
      fixture.detectChanges();
    });
  }));

});
