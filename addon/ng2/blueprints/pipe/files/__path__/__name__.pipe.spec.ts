import {
  beforeEachProviders,
  describe,
  expect,
  inject,
  it
} from '@angular/core/testing';
import { <%= classifiedModuleName %>Pipe } from './<%= dasherizedModuleName %>.pipe';

describe('Pipe: <%= classifiedModuleName %>', () => {
  beforeEachProviders(() => [<%= classifiedModuleName%>Pipe]);

  it('should transform the input', inject([<%= classifiedModuleName %>Pipe], (pipe: <%= classifiedModuleName %>Pipe) => {
      expect(pipe.transform(true)).toBe(null);
  }));
});
