function appendQuery(url, options) {
  return url + '?' + JSON.stringify(options);
}

describe('Todo', function() {

  describe('Server only render', function() {
    var subject;
    var result;

    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: true,
        client: false
      }));
    });

    it('should have a title', function() {
      subject = browser.getTitle();
      result  = 'Todo Angular 2';

      expect(subject).toEqual(result);
    });

    it('should verify if the main web elements are present in the page', function() {
      subject = element(by.deepCss('#todoapp')).isPresent();
      result  = true;

      expect(subject).toBe(result);
    });

    it('should be able to add items in the to do list', function() {
      subject = element.all(by.deepCss('.view label')).first().getText();
      result  = 'Universal JavaScript';

      expect(subject).toEqual(result);
    });
  });

  describe('Client only render', function() {
    var subject;
    var result;
    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: false,
        client: true
      }));
    });

    xit('should be able to clean the to do list', function() {
      var toggleAll = element(by.deepCss('#toggle-all'));
      var clearCompletedButton = element(by.deepCss('#clear-completed'));
      var viewDiv = element(by.deepCss('.view'));

      toggleAll.click();
      clearCompletedButton.click();

      subject = viewDiv.isPresent();
      result  = false;

      expect(subject).toBe(result);
    });
  });


  describe('Server and Client rendered', function() {
    var subject;
    var result;
    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: true,
        client: true
      }));
    });

    xit('should be able to clean the to do list', function() {
      var toggleAll = element(by.deepCss('#toggle-all'));
      var clearCompletedButton = element(by.deepCss('#clear-completed'));
      var viewDiv = element(by.deepCss('.view'));

      toggleAll.click();
      clearCompletedButton.click();

      subject = viewDiv.isPresent();
      result  = false;

      expect(subject).toBe(result);
    });
  });


});
