import {<%= classifiedModuleName %>} from './<%= fileName %>';

describe('<%= classifiedModuleName %>', () => {
  describe('.constructor()', () => {
    it('should create an instance', () => {
      expect(new <%= classifiedModuleName %>()).toBeTruthy();
    });
  });
});
