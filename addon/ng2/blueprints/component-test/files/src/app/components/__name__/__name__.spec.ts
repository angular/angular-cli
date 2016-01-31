import {
  it,
  iit,
  describe,
  ddescribe,
  expect,
  inject,
  TestComponentBuilder,
  beforeEachProviders
} from 'angular2/testing';
import {provide} from 'angular2/core';
import {<%= classifiedModuleName %>} from './<%= dasherizedModuleName %>';


describe('<%= classifiedModuleName %> Component', () => {

  beforeEachProviders(() => []);


  it('should ...', inject([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    tcb.createAsync(<%= classifiedModuleName %>).then((fixture) => {
      fixture.detectChanges();
    });
  }));

});
