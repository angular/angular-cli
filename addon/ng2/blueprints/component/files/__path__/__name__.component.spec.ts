import {
  async,
  beforeEachProviders,
  describe,
  ddescribe,
  expect,
  iit,
  it,
  inject,
  ComponentFixture,
  TestComponentBuilder
} from 'angular2/testing';
import {<%= classifiedModuleName %>Component} from './<%= dasherizedModuleName %>.component';

describe('Component: <%= classifiedModuleName %>', () => {
  beforeEachProviders(() => [<%= classifiedModuleName %>Component]);
  
  it('should create the component', inject([<%= classifiedModuleName %>Component], (component: <%= classifiedModuleName %>Component) => { 
    expect(component).toBeTruthy(); 
  })); 
});
