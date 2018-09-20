import { <%= classify(name) %>Directive } from './<%= dasherize(name) %>.directive';

describe('<%= classify(name) %>Directive', () => {
  it('should create an instance', () => {
    const directive = new <%= classify(name) %>Directive();
    expect(directive).toBeTruthy();
  });
});
