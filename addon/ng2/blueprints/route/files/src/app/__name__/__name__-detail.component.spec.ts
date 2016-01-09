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
import {<%= classifiedModuleName %>DetailComponent} from './<%= dasherizedModuleName %>-detail.component';

describe('<%= classifiedModuleName %>DetailComponent', () => {

  beforeEachProviders(() => []);

  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(<%= classifiedModuleName %>DetailComponent).then((fixture) => {
      fixture.detectChanges();
    });
  }));

});
