/* tslint:disable:no-unused-variable */

import { By }           from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import {
  beforeEach, beforeEachProviders,
  describe, xdescribe,
  expect, it, xit,
  async, inject
} from '@angular/core/testing';

import { <%= classifiedModuleName %>Component } from './<%= dasherizedModuleName %>.component';

describe('Component: <%= classifiedModuleName %>', () => {
  it('should create an instance', () => {
    let component = new <%= classifiedModuleName %>Component();
    expect(component).toBeTruthy();
  });
});
