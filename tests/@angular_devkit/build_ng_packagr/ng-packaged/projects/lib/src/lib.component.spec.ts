import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LibComponent } from './lib.component';

describe('LibComponent', () => {
  let component: LibComponent;
  let fixture: ComponentFixture<LibComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LibComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
