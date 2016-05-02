import {
  describe,
  ddescribe,
  expect,
  iit,
  it
} from 'angular2/testing';
import {<%= classifiedModuleName %>} from './<%= fileName %>';

describe('<%= classifiedModuleName %>', () => {
  it('should create an instance', () => {
    expect(new <%= classifiedModuleName %>()).toBeTruthy();
  });
});
