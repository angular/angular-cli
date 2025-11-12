---
title: Signal Form with Cross-Field Validation
summary: Implements a cross-field validator by applying a validator to one field that reactively depends on the value of another field using `valueOf`.
keywords:
  - signal forms
  - form
  - control
  - validation
  - cross-field validation
  - valueOf
  - schema
  - minLength
  - submit
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to implement validation logic that depends on the values of multiple fields simultaneously. It solves the problem of ensuring consistency between related fields, such as verifying that a "confirm password" field matches the "password" field.

## When to Use

Use this pattern when the validity of one form field depends on the value of another. This is common in registration forms, password change forms, and any form where two fields must be consistent with each other. The recommended approach is to apply a validator to the field where the error should be reported (e.g., `confirmPassword`) and use the `valueOf` function in the validation context to reactively get the value of the other field it depends on (e.g., `password`).

## Key Concepts

- **`validate()`:** A function used within a schema to add a validator to a specific field.
- **`valueOf()`:** A function available in the validation context that allows you to reactively access the value of any other field in the form.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component that defines and manages a password change form.

### password-form.component.ts

This file defines the component's logic. The schema applies a validator to `confirmPassword` that compares its value to the value of the `password` field.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import {
  form,
  schema,
  validate,
  requiredError,
  minLengthError,
  customError,
  submit,
  Control,
} from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';

export interface PasswordForm {
  password: string;
  confirmPassword: string;
}

const passwordSchema = schema<PasswordForm>((passwordForm) => {
  validate(passwordForm.password, ({ value }) => {
    if (value() === '') return requiredError();
    if (value().length < 8) return minLengthError(8);
    return null;
  });

  validate(passwordForm.confirmPassword, ({ value, valueOf }) => {
    if (value() !== valueOf(passwordForm.password)) {
      return customError({ kind: 'mismatch' });
    }
    return null;
  });
});

@Component({
  selector: 'app-password-form',
  imports: [JsonPipe, Control],
  templateUrl: './password-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordFormComponent {
  readonly submitted = output<PasswordForm>();

  passwordModel = signal<PasswordForm>({
    password: '',
    confirmPassword: '',
  });

  passwordForm = form(this.passwordModel, passwordSchema);

  async handleSubmit() {
    await submit(this.passwordForm, async () => {
      this.submitted.emit(this.passwordForm().value());
    });
  }
}
```

### password-form.component.html

This file provides the template for the form, showing how to display errors for both field-level and cross-field validation rules.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>
      Password:
      <input type="password" [control]="passwordForm.password" />
    </label>
    @if (passwordForm.password().errors().length > 0) {
    <div class="errors">
      @for (error of passwordForm.password().errors(); track error) { @switch (error.kind) { @case
      ('required') {
      <p>Password is required.</p>
      } @case ('minLength') {
      <p>Password must be at least 8 characters long.</p>
      } } }
    </div>
    }
  </div>
  <div>
    <label>
      Confirm Password:
      <input type="password" [control]="passwordForm.confirmPassword" />
    </label>
    @if (passwordForm.confirmPassword().errors().length > 0) {
    <div class="errors">
      @for (error of passwordForm.confirmPassword().errors(); track error) { @switch (error.kind) {
      @case ('mismatch') {
      <p>Passwords do not match.</p>
      } } }
    </div>
    }
  </div>

  <button type="submit">Submit</button>
</form>
```

## Usage Notes

- The native `(submit)` event on the `<form>` element is bound to the `handleSubmit` method. It's important to call `$event.preventDefault()` to prevent a full page reload.
- The `handleSubmit` method uses the `submit()` helper to manage the submission process.

## How to Use This Example

The parent component listens for the `(submitted)` event and receives the strongly-typed form data.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { PasswordFormComponent, PasswordForm } from './password-form.component';

@Component({
  selector: 'app-root',
  imports: [PasswordFormComponent, JsonPipe],
  template: `
    <h1>Change Password</h1>
    <app-password-form (submitted)="onPasswordSubmit($event)"></app-password-form>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: PasswordForm | null = null;

  onPasswordSubmit(data: PasswordForm) {
    this.submittedData = data;
    console.log('Password data submitted:', data);
  }
}
```
