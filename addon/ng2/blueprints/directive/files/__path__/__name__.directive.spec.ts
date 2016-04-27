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
} from '@angular/tesing';
import {provide, Component} from '@angular/core';
import {<%= classifiedModuleName %>} from './<%= dasherizedModuleName %>.directive';

@Component({
  selector: 'test-component',
  template: `<div <%= dasherizedModuleName %>></div>`
})
class TestComponent {}

describe('<%= classifiedModuleName %> Directive', () => {

  beforeEachProviders((): any[] => []);


  it('should ...', async(inject([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(TestComponent).then((fixture: ComponentFixture) => {
      fixture.detectChanges();
    });
  })));

});
