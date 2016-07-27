import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('App: TestProject', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({ declarations: [AppComponent] });
    TestBed.compileComponents();
  }));

  it('should create the app', () => {
    const compFixture = TestBed.createComponent(AppComponent);
    expect(compFixture).toBeTruthy();
  });

  it('should have a title `app works!`', () => {
    const compFixture = TestBed.createComponent(AppComponent);
    expect(compFixture.componentInstance.title).toBe('app works!');
  });
});
