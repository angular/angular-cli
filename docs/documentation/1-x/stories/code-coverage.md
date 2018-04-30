# Code Coverage

With the Angular CLI we can run unit tests as well as create code coverage reports. Code coverage reports allow us to see any parts of our code base that may not be properly tested by our unit tests.

To generate a coverage report run the following command in the root of your project

```bash
ng test --watch=false --code-coverage
```

Once the tests complete a new `/coverage` folder will appear in the project. In your Finder or Windows Explorer open the `index.html` file. You should see a report with your source code and code coverage values. 

Using the code coverage percentages we can estimate how much of our code is tested. It is up to your team to determine how much code should be unit tested. 

## Code Coverage Enforcement

If your team decides on a set minimum amount to be unit tested you can enforce this minimum with the Angular CLI. For example our team would like the code base to have a minimum of 80% code coverage. To enable this open the `karma.conf.js` and add the following in the `coverageIstanbulReporter:` key

```javascript
coverageIstanbulReporter: {
  reports: [ 'html', 'lcovonly' ],
  fixWebpackSourcePaths: true,
  thresholds: {
    statements: 80,
    lines: 80,
    branches: 80,
    functions: 80
  }
}
``` 

The `thresholds` property will enforce a minimum of 80% code coverage when the unit tests are run in the project.