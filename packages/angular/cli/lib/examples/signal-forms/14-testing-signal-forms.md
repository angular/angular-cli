---
title: Testing Signal Forms
summary: Demonstrates how to write unit tests for a component that uses a signal form, including how to interact with fields and assert on validity and submission.
keywords:
  - signal forms
  - testing
  - unit testing
  - TestBed
  - ComponentFixture
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
  - 'unit testing'
experimental: true
---

## Purpose

The purpose of this pattern is to ensure the correctness and reliability of components that use signal forms. It solves the problem of verifying form logic, including validation, state changes, and data submission, within an automated testing environment.

## When to Use

Use this pattern for every component that contains a signal form. Writing unit tests is a critical best practice that prevents regressions, documents component behavior, and ensures that your forms behave as expected under various conditions.

## Key Concepts

- **`TestBed`:** The primary Angular utility for configuring a testing module and creating components for tests.
- **`ComponentFixture`:** A handle on a created component instance, used to interact with the component and its template.
- **`fixture.nativeElement`:** Used to query for and interact with DOM elements in the component's template.
- **`fixture.componentInstance`:** Used to access the component's class instance to spy on methods or assert on properties.

## Example Files

This example consists of a standalone component and its corresponding unit test file.

### login-form.component.ts

This file defines a standalone login form component with basic validation, serving as the target for the unit tests.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, required, email, submit } from '@angular/forms/signals';

export interface LoginForm {
  email: string;
  password: string;
}

const loginSchema = schema<LoginForm>((form) => {
  required(form.email);
  email(form.email);
  required(form.password);
});

@Component({
  selector: 'app-login-form',
  template: `
    <form (submit)="handleSubmit(); $event.preventDefault()">
      <input type="email" [control]="loginForm.email" />
      <input type="password" [control]="loginForm.password" />
      <button type="submit" [disabled]="!loginForm().valid()">Log In</button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
  readonly submitted = output<LoginForm>();

  loginModel = signal<LoginForm>({ email: '', password: '' });
  loginForm = form(this.loginModel, loginSchema);

  async handleSubmit() {
    await submit(this.loginForm, async () => {
      this.submitted.emit(this.loginForm().value());
    });
  }
}
```

### login-form.component.spec.ts

This file contains the unit tests for the component, demonstrating how to assert on form state and simulate user interaction.

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginFormComponent, LoginForm } from './login-form.component';

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let component: LoginFormComponent;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should be invalid initially', () => {
    expect(component.loginForm().valid()).toBe(false);
  });

  it('should be invalid when email is invalid', () => {
    const emailInput = nativeElement.querySelector('input[type="email"]')!;
    emailInput.value = 'invalid-email';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.loginForm().valid()).toBe(false);
    expect(
      component.loginForm
        .email()
        .errors()
        .some((e) => e.kind === 'email'),
    ).toBe(true);
  });

  it('should be valid when all fields are filled correctly', () => {
    const emailInput = nativeElement.querySelector('input[type="email"]')!;
    const passwordInput = nativeElement.querySelector('input[type="password"]')!;

    emailInput.value = 'test@example.com';
    emailInput.dispatchEvent(new Event('input'));

    passwordInput.value = 'password123';
    passwordInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    expect(component.loginForm().valid()).toBe(true);
  });

  it('should emit the form value on submit when valid', async () => {
    spyOn(component.submitted, 'emit');

    const emailInput = nativeElement.querySelector('input[type="email"]')!;
    const passwordInput = nativeElement.querySelector('input[type="password"]')!;
    const form = nativeElement.querySelector('form')!;

    emailInput.value = 'test@example.com';
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'password123';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable(); // Wait for async submit() helper

    const expectedData: LoginForm = { email: 'test@example.com', password: 'password123' };
    expect(component.submitted.emit).toHaveBeenCalledWith(expectedData);
  });
});
```

## Usage Notes

- To simulate user input, you query for the input element, set its `value`, and then dispatch an `input` event.
- You must call `fixture.detectChanges()` after dispatching an event to trigger Angular's change detection and update the component's state.
- You can directly access the form state (`component.loginForm().valid()`) and field state (`component.loginForm.email().errors()`) to make assertions.
- Use `spyOn` for the `submitted` EventEmitter to verify that it is called with the correct data.

## How to Use This Example

Run the component's unit tests using your project's configured test runner. This is typically accomplished by executing the test script defined in your `package.json` file.

For example:

```bash
npm test
```
