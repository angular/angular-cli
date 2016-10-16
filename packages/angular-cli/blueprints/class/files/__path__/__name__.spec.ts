import {<%= classifiedModuleName %>} from './<%= fileName %>';

describe('<%= classifiedModuleName %>', () => {
  it('should create an instance', () => {
    expect(new <%= classifiedModuleName %>()).toBeTruthy();
  });
});
