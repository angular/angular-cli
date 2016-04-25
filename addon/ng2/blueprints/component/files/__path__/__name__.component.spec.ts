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
import {provide} from 'angular2/core';<% if (route) { %>
import {Router, RouteParams} from 'angular2/router';<% } %>
import {<%= classifiedModuleName %>Component} from './<%= dasherizedModuleName %>.component';<% if (route) { %>
class MockRouter {
  registerPrimaryOutlet() { }
}

class MockRouteParams {
  get() { return 1; }
}<% } %>

describe('<%= classifiedModuleName %> Component', () => {
<% if (route) { %>
  beforeEachProviders(() => [
    provide(Router, { useClass: MockRouter }),
    provide(RouteParams, { useClass: MockRouteParams }),
  ]);
<% } else { %>
  beforeEachProviders((): any[] => []);
<% } %>
  it('should ...', injectAsync([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(<%= classifiedModuleName %>Component).then((fixture: ComponentFixture) => {
      fixture.detectChanges();
    });
  }));

});
