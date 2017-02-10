import { <%= jsComponentName %>Page } from './app.po';

describe('<%= htmlComponentName %> App', () => {
  let page: <%= jsComponentName %>Page;

  beforeEach(() => {
    page = new <%= jsComponentName %>Page();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('<%= prefix %> works!');
  });
});
