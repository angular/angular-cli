import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { <%= classifiedModuleName %>Component } from './<%= dasherizedModuleName %>.component';

describe('<%= classifiedModuleName %>Component', () => {
  let component: <%= classifiedModuleName %>Component;
  let fixture: ComponentFixture<<%= classifiedModuleName %>Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ <%= classifiedModuleName %>Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(<%= classifiedModuleName %>Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
