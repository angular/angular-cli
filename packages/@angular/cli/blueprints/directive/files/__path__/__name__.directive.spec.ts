import { <%= classifiedModuleName %>Directive } from './<%= dasherizedModuleName %>.directive';

describe('<%= classifiedModuleName %>Directive', () => {

  let <%= camelizedModuleName %>Directive: <%= classifiedModuleName %>Directive;

  it('should create an instance', () => {
    <%= camelizedModuleName %>Directive = new <%= classifiedModuleName %>Directive();
    expect(<%= camelizedModuleName %>Directive).toBeTruthy();
  });
});
