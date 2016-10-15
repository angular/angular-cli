/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { <%= classifiedModuleName %>Component } from './<%= dasherizedModuleName %>.component';

describe('<%= classifiedModuleName %>Component', () => {
  let component: <%= classifiedModuleName %>Component;
  let fixture: ComponentFixture<<%= classifiedModuleName %>Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ <%= classifiedModuleName %>Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(<%= classifiedModuleName %>Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
