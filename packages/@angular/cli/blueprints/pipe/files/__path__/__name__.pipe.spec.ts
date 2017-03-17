import { <%= classifiedModuleName %>Pipe } from './<%= dasherizedModuleName %>.pipe';

describe('<%= classifiedModuleName %>Pipe', () => {
  it('create an instance', () => {
    const pipe = new <%= classifiedModuleName %>Pipe();
    expect(pipe).toBeTruthy();
  });
});
