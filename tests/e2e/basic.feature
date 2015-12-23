Feature: Basic Workflow
  As a user 
  I want to be able to install the tool, generate a project, build it, test it,
  generate a component, generate a service, generate a pipe and test it again  
  
  Scenario: Generate new project
    Given the name "test-project"
    When I create a new project
    Then it creates the files:
      """
      ember-cli-build.js
      .gitignore
      karma-test-shim.js
      karma.conf.js
      package.json
      src/app/test-project.html
      src/app/test-project.spec.ts
      src/app/test-project.ts
      src/app.ts
      src/favicon.ico
      src/index.html
      src/tsconfig.json
      """
    Then it initializes a git repository
    Then it install npm dependencies
    
  Scenario: Build new project
    Given the directory "test-project"
    When I build the project
    Then it creates the files:
      """
      """
  
  Scenario: Run tests for new project
    Given the directory "test-project"
    When I run the tests
    Then it passes with:
      """
      ..
      Chrome
      """
      
  Scenario: Generate a component
    Given the directory "test-project"
      And the name "test-component"
    When I generate a component
    Then it creates the files:
      """
      """

  Scenario: Run tests for a project with a generated component
    Given the directory "test-project"
    When I run the tests
    Then it passes with:
      """
      ...
      Chrome
      """