---
title: Server-Side Validation with `submit()`
summary: Demonstrates how to use the `submit()` helper function to streamline form submission and integrate server-side validation errors directly into the form's state.
keywords:
  - signal forms
  - submit
  - server-side validation
  - async
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
  - 'asynchronous validation'
experimental: true
---

## Purpose

The purpose of this pattern is to provide a robust, standardized way to handle form submissions, especially when they involve asynchronous operations like API calls that can return validation errors. It solves the problem of manually managing submission states (e.g., disabling buttons during submission) and mapping backend error responses back to the correct form fields.

## When to Use

Use the `submit()` helper function for any form submission that interacts with a backend. It simplifies the process by automatically handling the `submitting` state and integrating any returned errors. This is the recommended best practice for handling form submissions in signal forms.

## Key Concepts

- **`submit()`:** An async helper function that takes a `Field` and a submission action. It marks the form as `submitting` while the action is in progress and automatically applies any validation errors returned by the action to the appropriate fields.
- **Server-Side `ValidationError`:** The submission action can return a `ValidationError` (or an array of them) with a `field` property to target the error to a specific field in the form.

## Example Files

This example consists of a standalone component that uses the `submit()` helper to handle a registration flow with potential server-side errors.

### registration-form.component.ts

This file defines the component's logic, including a `handleSubmit` method that uses the `submit()` helper.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, required, submit, Field } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';
import { ValidationError } from '@angular/forms/signals';

export interface RegistrationData {
  username: string;
  email: string;
}

// Mock API client
const mockApiClient = {
  async register(
    data: RegistrationData,
    form: Field<RegistrationData>,
  ): Promise<ValidationError[] | null> {
    console.log('Submitting to server:', data);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network latency

    if (data.username.toLowerCase() === 'admin') {
      return [
        { field: form.username, message: 'Username "admin" is not allowed.', kind: 'server' },
      ];
    }
    if (data.email.endsWith('@spam.com')) {
      return [{ field: form.email, message: 'Email provider is not allowed.', kind: 'server' }];
    }

    return null; // Success
  },
};

const registrationSchema = schema<RegistrationData>((form) => {
  required(form.username);
  required(form.email);
});

@Component({
  selector: 'app-registration-form',
  imports: [JsonPipe],
  templateUrl: './registration-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationFormComponent {
  readonly submitted = output<RegistrationData>();

  registrationModel = signal<RegistrationData>({
    username: '',
    email: '',
  });

  registrationForm = form(this.registrationModel, registrationSchema);

  async handleSubmit() {
    await submit(this.registrationForm, async (form) => {
      const serverErrors = await mockApiClient.register(form().value(), form);
      if (serverErrors) {
        return serverErrors;
      }

      this.submitted.emit(form().value());
      return null;
    });
  }
}
```

### registration-form.component.html

This file provides the template, which disables the submit button based on the form's `submitting` and `valid` states.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>Username:</label>
    <input type="text" [control]="registrationForm.username" />
    @if (registrationForm.username().errors().length > 0) {
    <div class="errors">
      @for (error of registrationForm.username().errors()) {
      <p>{{ error.message }}</p>
      }
    </div>
    }
  </div>

  <div>
    <label>Email:</label>
    <input type="email" [control]="registrationForm.email" />
    @if (registrationForm.email().errors().length > 0) {
    <div class="errors">
      @for (error of registrationForm.email().errors()) {
      <p>{{ error.message }}</p>
      }
    </div>
    }
  </div>

  <button type="submit" [disabled]="registrationForm().submitting()">
    @if (registrationForm().submitting()) {
    <span>Submitting...</span>
    } @else {
    <span>Register</span>
    }
  </button>
</form>
```

## Usage Notes

- The submit button is disabled while the form is invalid OR while it is submitting (`[disabled]="!registrationForm().valid() || registrationForm().submitting()"`).
- The `submit` function automatically sets the form's `submitting` signal to `true` before the async action and `false` after it completes.
- If the async action returns an array of `ValidationError`, `submit` will automatically find the `field` specified in each error and add the error to that field's `errors` signal.

## How to Use This Example

The parent component listens for the `(submitted)` event, which is only fired on a successful submission.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RegistrationFormComponent, RegistrationData } from './registration-form.component';

@Component({
  selector: 'app-root',
  imports: [RegistrationFormComponent, JsonPipe],
  template: `
    <h1>Register</h1>
    <app-registration-form (submitted)="onFormSubmit($event)"></app-registration-form>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: RegistrationData | null = null;

  onFormSubmit(data: RegistrationData) {
    this.submittedData = data;
    console.log('Registration data submitted successfully:', data);
  }
}
```
