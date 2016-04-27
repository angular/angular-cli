import {
  it,
  iit,
  describe,
  ddescribe,
  expect,
  inject,
  beforeEachProviders
} from '@angular/core/testing';
import { TestComponentBuilder } from '@angular/compiler/testing';
import { <%= classifiedModuleName %> } from './<%= dasherizedModuleName %>.pipe';

describe('<%= classifiedModuleName %> Pipe', () => {
  beforeEachProviders(() => [<%= classifiedModuleName%>]);

  it('should transform the input', inject([<%= classifiedModuleName %>], (pipe:<%= classifiedModuleName %>) => {
      expect(pipe.transform(true)).toBe(null);
  }));
});
