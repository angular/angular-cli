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
import {Router, RouteParams} from 'angular2/router';
import {<%= classifiedModuleName %>, <%= classifiedModuleName %>Service} from './<%= dasherizedModuleName %>.service';

class Mock<%= classifiedModuleName %>Service {
  get() { return Promise.resolve(new <%= classifiedModuleName %>(1, 'one')); }
}

class MockRouter {
  navigate() { }
}

class MockRouteParams {
  get() { return 1; }
}

describe('<%= classifiedModuleName %>DetailComponent', () => {

  beforeEachProviders(() => [
    provide(<%= classifiedModuleName %>Service, {useClass: Mock<%= classifiedModuleName %>Service}),
    provide(Router, {useClass: MockRouter}),
    provide(RouteParams, {useClass: MockRouteParams}),
  ]);

  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(<%= classifiedModuleName %>DetailComponent).then((fixture) => {
      fixture.detectChanges();
    });
  }));

});
