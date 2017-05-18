import { <%= jsComponentName %>Page } from './app.po';

describe('<%= htmlComponentName %> App', () => {
  let page: <%= jsComponentName %>Page;

  beforeEach(() => {
    page = new <%= jsComponentName %>Page();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    page.getParagraphText().then(msg => expect(msg).toEqual('Welcome to <%= prefix %>!!'));
  });
});
