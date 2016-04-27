import {
  it,
  iit,
  describe,
  ddescribe,
  expect,
  inject,
  TestComponentBuilder,
  beforeEachProviders
} from '@angular/tesing';
import {provide} from '@angular/core';
import {<%= classifiedModuleName %>} from './<%= dasherizedModuleName %>.pipe';

describe('<%= classifiedModuleName %> Pipe', () => {

  beforeEachProviders(() => [<%= classifiedModuleName%>]);

  it('should transform the input', inject([<%= classifiedModuleName %>], (pipe:<%= classifiedModuleName %>) => {
      expect(pipe.transform(true)).toBe(null);
  }));

});
