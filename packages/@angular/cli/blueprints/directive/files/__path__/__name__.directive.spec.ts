import { <%= classifiedModuleName %>Directive } from './<%= dasherizedModuleName %>.directive';

describe('<%= classifiedModuleName %>Directive', () => {
  it('should create an instance', () => {
    const directive = new <%= classifiedModuleName %>Directive();
    expect(directive).toBeTruthy();
  });
});
