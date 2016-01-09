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
import {<%= classifiedModuleName %>ListComponent} from './<%= dasherizedModuleName %>-list.component';

describe('<%= classifiedModuleName %>ListComponent', () => {

  beforeEachProviders(() => []);

  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(<%= classifiedModuleName %>ListComponent).then((fixture) => {
      fixture.detectChanges();
    });
  }));

});
