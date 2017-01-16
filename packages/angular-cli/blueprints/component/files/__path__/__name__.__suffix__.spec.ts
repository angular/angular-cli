/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { <%= classifiedModuleName %><%= classifiedSuffix %> } from './<%= dasherizedModuleName %>.<%= suffix %>';

describe('<%= classifiedModuleName %><%= classifiedSuffix %>', () => {
  let component: <%= classifiedModuleName %><%= classifiedSuffix %>;
  let fixture: ComponentFixture<<%= classifiedModuleName %><%= classifiedSuffix %>>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ <%= classifiedModuleName %><%= classifiedSuffix %> ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(<%= classifiedModuleName %><%= classifiedSuffix %>);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
