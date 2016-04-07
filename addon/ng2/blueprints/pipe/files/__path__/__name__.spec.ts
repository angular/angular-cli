import {
  it,
  iit,
  describe,
  ddescribe,
  expect,
  inject,
  injectAsync,
  TestComponentBuilder,
  beforeEachProviders
} from 'angular2/testing';
import {provide} from 'angular2/core';
import {<%= classifiedModuleName %>} from './<%= dasherizedModuleName %>';


describe('<%= classifiedModuleName %> Pipe', () => {

  beforeEachProviders(() => [<%= classifiedModuleName%>]);


  it('should transform the input', inject([<%= classifiedModuleName %>], (pipe:<%= classifiedModuleName %>) => {
      expect(pipe.transform(true)).toBe(null);
  }));

});
