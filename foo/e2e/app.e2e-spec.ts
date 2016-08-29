import { FooPage } from './app.po';

describe('foo App', function() {
  let page: FooPage;

  beforeEach(() => {
    page = new FooPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
