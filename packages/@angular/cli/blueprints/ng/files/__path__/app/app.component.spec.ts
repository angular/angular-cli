import { ComponentFixture, TestBed } from '@angular/core/testing';<% if (routing) { %>
import { RouterTestingModule } from '@angular/router/testing';<% } %>

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent >;

  beforeEach(() => {
    TestBed.configureTestingModule({<% if (routing) { %>
      imports: [
        RouterTestingModule
      ],<% } %>
      declarations: [
        AppComponent
      ],
    });
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('should create the app', () => {
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title '<%= prefix %>'`, () => {
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('<%= prefix %>');
  });

  it('should render title in a h1 tag', () => {
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Welcome to <%= prefix %>!!');
  });
});
