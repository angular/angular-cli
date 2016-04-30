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
import {<%= jsComponentName %>App} from '../app/<%= htmlComponentName %>.component';

beforeEachProviders(() => [<%= jsComponentName %>App]);

describe('App: <%= jsComponentName %>', () => {  
  it('should create the app', inject([<%= jsComponentName %>App], (app: <%= jsComponentName %>App) => { 
    expect(app).toBeTruthy(); 
  })); 
});

