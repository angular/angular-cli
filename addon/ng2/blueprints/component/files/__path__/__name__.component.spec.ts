import {
  beforeEach,
  beforeEachProviders,
  describe,
  expect,
  it,
  inject,
} from '@angular/core/testing';
import { ComponentFixture, TestComponentBuilder } from '@angular/compiler/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { <%= classifiedModuleName %>Component } from './<%= dasherizedModuleName %>.component';

describe('Component: <%= classifiedModuleName %>', () => {
  let builder: TestComponentBuilder;

  beforeEachProviders(() => [<%= classifiedModuleName %>Component]);
  beforeEach(inject([TestComponentBuilder], function (tcb: TestComponentBuilder) {
    builder = tcb;
  }));

  it('should inject the component', inject([<%= classifiedModuleName %>Component],
      (component: <%= classifiedModuleName %>Component) => {
    expect(component).toBeTruthy();
  }));

  it('should create the component', inject([], () => {
    return builder.createAsync(<%= classifiedModuleName %>ComponentTestController)
      .then((fixture: ComponentFixture<any>) => {
        let query = fixture.debugElement.query(By.directive(<%= classifiedModuleName %>Component));
        expect(query).toBeTruthy();
        expect(query.componentInstance).toBeTruthy();
      });
  }));
});

@Component({
  selector: 'test',
  template: `
    <<%= selector %>></<%= selector %>>
  `,
  directives: [<%= classifiedModuleName %>Component]
})
class <%= classifiedModuleName %>ComponentTestController {
}

