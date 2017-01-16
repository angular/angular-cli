/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { <%= classifiedModuleName %><%= suffixName %> } from './<%= dasherizedModuleName %>.<%= suffix %>';

describe('<%= classifiedModuleName %><%= suffixName %>', () => {
  let component: <%= classifiedModuleName %><%= suffixName %>;
  let fixture: ComponentFixture<<%= classifiedModuleName %><%= suffixName %>>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ <%= classifiedModuleName %><%= suffixName %> ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(<%= classifiedModuleName %><%= suffixName %>);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
