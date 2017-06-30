import { <%= classify(name) %>Module } from './<%= dasherize(name) %>.module';

describe('<%= classify(name) %>Module', () => {
  let <%= camelize(name) %>Module: <%= classify(name) %>Module;

  beforeEach(() => {
    <%= camelize(name) %>Module = new <%= classify(name) %>Module();
  });

  it('should create an instance', () => {
    expect(<%= camelize(name) %>Module).toBeTruthy();
  });
});
