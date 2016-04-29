import {
  async,
  beforeEachProviders,
  describe,
  ddescribe,
  expect,
  iit,
  it,
  inject,
  ComponentFixture,
  TestComponentBuilder
} from '@angular/testing';
import {provide} from '@angular/core';<% if (route) { %>
import {Router, RouteParams} from '@angular/router';<% } %>
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
  it('should ...', async(inject([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(<%= classifiedModuleName %>Component).then((fixture: ComponentFixture) => {
      fixture.detectChanges();
    });
  })));

});
