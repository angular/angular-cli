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
import {provide, Component} from 'angular2/core';
import {<%= classifiedModuleName %>} from './<%= dasherizedModuleName %>';


@Component({
  selector: 'test-component',
  template: `<div <%= dasherizedModuleName %>></div>`
})
class TestComponent {}

describe('<%= classifiedModuleName %> Directive', () => {

  beforeEachProviders((): any[] => []);


  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(TestComponent).then((fixture) => {
      fixture.detectChanges();
    });
  }));

});
