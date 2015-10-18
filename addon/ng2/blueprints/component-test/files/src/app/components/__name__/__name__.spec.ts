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


describe('<%= classifiedModuleName %> Component', () => {

  beforeEachProviders(() => []);


  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(<%= classifiedModuleName %>).then((fixture) => {
      fixture.detectChanges();
    });
  }));

});
