import {ComponentFixture, TestComponentBuilder} from '@angular/compiler/testing';
import { provide, Component } from '@angular/core';
import { async, beforeEachProviders, describe, ddescribe, expect, inject, iit, it } from '@angular/core/testing';

import { <%= classifiedModuleName %> } from './<%= dasherizedModuleName %>.directive';

@Component({
  selector: 'test-component',
  template: `<div <%= dasherizedModuleName %>></div>`
})
class TestComponent {}

describe('<%= classifiedModuleName %> Directive', () => {
  beforeEachProviders((): any[] => []);

  it('should ...', async(inject([TestComponentBuilder], (tcb:TestComponentBuilder) => {
    return tcb.createAsync(TestComponent).then((fixture: ComponentFixture<any>) => {
      fixture.detectChanges();
    });
  })));
});
