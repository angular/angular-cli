import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FooBarComponent } from './foo-bar.component';

describe('FooBarComponent', () => {
  let component: FooBarComponent;
  let fixture: ComponentFixture<FooBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FooBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FooBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
