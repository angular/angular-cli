var webdriver = require('selenium-webdriver');

describe('Todo', function() {
  var EC = protractor.ExpectedConditions;
  afterEach(verifyNoBrowserErrors);

  describe('Server only render', function() {
    var subject;
    var result;

    beforeEach(function() {
      browser.get(appendQuery('/', {
        server: true,
        client: false,
        preboot: false,
        bootstrap: false
      }));
      // browser.driver.sleep(500);
    });

    it('should have default value for inputs', function() {
      subject = element(by.deepCss('#defaultValueInput')).getAttribute('value');
      result  = 'value8';

      expect(subject).toBe(result);
    });

    it('should have checked values for checkbox inputs', function() {
      subject = element.all(by.deepCss('input[checked]:checked')).count();
      result  = 3;

      expect(subject).toBe(result);
    });

  });

  describe('Client only render', function() {
    var subject;
    var result;


    beforeEach(function() {
      browser.get(appendQuery('/', {
        server: false,
        client: true,
        preboot: false,
        bootstrap: true
      }));
      browser.driver.sleep(500);
    });



  });


  describe('Server and Client rendered', function() {
    var subject;
    var result;
    beforeEach(function() {
      browser.get(appendQuery('/', {
        server: true,
        client: true,
        preboot: false,
        bootstrap: true
      }));
      browser.driver.sleep(500);
    });


  });

  describe('Server and Client rendered with Preboot.js', function() {
    var subject;
    var result;
    beforeEach(function() {
      browser.get(appendQuery('/', {
        server: true,
        client: true,
        preboot: true,
        bootstrap: false
      }));
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
