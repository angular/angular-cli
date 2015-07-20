var webdriver = require('selenium-webdriver');

describe('Todo', function() {
  var EC = protractor.ExpectedConditions;
  afterEach(verifyNoBrowserErrors);

  describe('Server only render', function() {
    var subject;
    var result;

    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: true,
        client: false,
        preboot: false,
        bootstrap: false
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
        client: true,
        preboot: false,
        bootstrap: true
      }));
      browser.driver.sleep(500);
    });

    it('should be able to complete a todo in the  list', function() {

      var currentTodo = element.all(by.deepCss('.view input')).first();
      browser.actions().mouseMove(currentTodo).click().perform();

      subject = element.all(by.deepCss('#todo-list .completed')).count();
      result  = 1;

      expect(subject).toBe(result);
    });


    it('should be able to clear completed items in the list', function() {

      var toggleAll = element(by.deepCss('#toggle-all'));
      var viewDiv = element(by.deepCss('.view'));

      toggleAll.click();

      var clearCompletedButton = element(by.deepCss('#clear-completed'));
      browser.actions().mouseMove(clearCompletedButton).click().perform();

      subject = viewDiv.isPresent();
      result  = false;

      expect(subject).toBe(result);
    });

    it('should be able to add a todo to the list', function() {

      var newTodoInput = element(by.deepCss('#new-todo'));

      var todoValue = 'new todo ' + Math.random();
      newTodoInput.sendKeys(todoValue);
      newTodoInput.sendKeys(protractor.Key.ENTER);

      subject = element.all(by.deepCss('.view label')).last().getText();
      result  = todoValue;

      expect(subject).toEqual(result);
    });

    it('should be able to remove a todo to the list', function() {

      var newTodoInput = element(by.deepCss('#new-todo'));

      var todoValue = 'new todo ' + Math.random();
      newTodoInput.sendKeys(todoValue);
      newTodoInput.sendKeys(protractor.Key.ENTER);


      browser.actions().mouseMove(element.all(by.deepCss('.view label')).last()).perform();
      var el = element.all(by.deepCss('.view button')).last();
      el.click();

      subject = element.all(by.deepCss('.view label')).last().getText();
      result  = todoValue;

      expect(subject).not.toEqual(result);
    });

  });


  describe('Server and Client rendered', function() {
    var subject;
    var result;
    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: true,
        client: true,
        preboot: false,
        bootstrap: true
      }));
      browser.driver.sleep(500);
    });

    it('should be able to complete a todo in the list', function() {

      var currentTodo = element.all(by.deepCss('.view input')).first();
      browser.actions().mouseMove(currentTodo).click().perform();

      subject = element.all(by.deepCss('#todo-list .completed')).count();
      result  = 1;

      expect(subject).toBe(result);
    });


    it('should be able to clear completed items in the list', function() {

      var toggleAll = element(by.deepCss('#toggle-all'));
      var viewDiv = element(by.deepCss('.view'));

      toggleAll.click();

      var clearCompletedButton = element(by.deepCss('#clear-completed'));
      browser.actions().mouseMove(clearCompletedButton).click().perform();

      subject = viewDiv.isPresent();
      result  = false;

      expect(subject).toBe(result);
    });


    it('should be able to add a todo to the list', function() {

      var newTodoInput = element(by.deepCss('#new-todo'));

      var todoValue = 'new todo ' + Math.random();
      newTodoInput.sendKeys(todoValue);
      newTodoInput.sendKeys(protractor.Key.ENTER);

      subject = element.all(by.deepCss('.view label')).last().getText();
      result  = todoValue;

      expect(subject).toEqual(todoValue);
    });

    it('should be able to remove a todo to the list', function() {

      var newTodoInput = element(by.deepCss('#new-todo'));

      var todoValue = 'new todo ' + Math.random();
      newTodoInput.sendKeys(todoValue);
      newTodoInput.sendKeys(protractor.Key.ENTER);


      browser.actions().mouseMove(element.all(by.deepCss('.view label')).last()).perform();
      var el = element.all(by.deepCss('.view button')).last();
      el.click();

      subject = element.all(by.deepCss('.view label')).last().getText();
      result  = todoValue;

      expect(subject).not.toEqual(result);
    });

  });

  describe('Server and Client rendered with Preboot.js', function() {
    var subject;
    var result;
    beforeEach(function() {
      browser.get(appendQuery('/examples/todo', {
        server: true,
        client: true,
        preboot: true,
        bootstrap: false
      }));
    });

    it('should be able maintain input values after client render', function() {

      var newTodoInput1 = element(by.deepCss('#new-todo'));

      var subject1 = newTodoInput1.getAttribute('value');
      var result1  = '';

      expect(subject1).toEqual(result1);

      bootstrapClient({ dontSleep: true});

      var todoValue = 'new todo ' + Math.random();
      newTodoInput1.sendKeys(todoValue);

      var subject2 = newTodoInput1.getAttribute('value');
      var result2  = todoValue;

      expect(subject2).toEqual(result2);

      browser.driver.sleep(500);

      var newTodoInput2 = element(by.deepCss('#new-todo'));

      subject = newTodoInput2.getAttribute('value');
      result  = todoValue;

      expect(subject).toEqual(result);

    });



  });

});

function bootstrapClient(config) {
  config = config || {};
  var EC = protractor.ExpectedConditions;
  var bootstrapButton = element(by.deepCss('#bootstrapButton'));
  browser.wait(EC.elementToBeClickable(bootstrapButton), 10000);
  bootstrapButton.click();
  if (!config.dontSleep) {
    browser.driver.sleep(500);
  }
}
function verifyNoBrowserErrors() {
  // TODO(tbosch): Bug in ChromeDriver: Need to execute at least one command
  // so that the browser logs can be read out!
  browser.executeScript('1+1');
  browser.manage().logs().get('browser').then(function(browserLog) {
    var filteredLog = browserLog.filter(function(logEntry) {
      if (logEntry.level.value >= webdriver.logging.Level.INFO.value) {
        console.log('>> ' + logEntry.message);
      }
      return logEntry.level.value > webdriver.logging.Level.WARNING.value;
    });
    expect(filteredLog.length).toEqual(0);
  });
}

function appendQuery(url, options) {
  return url + Object.keys(options).map(function(key) {
    return '&' + key + '=' + options[key];
  }).join('').replace('&', '?');
}
