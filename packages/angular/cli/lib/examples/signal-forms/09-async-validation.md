---
title: Signal Form with Asynchronous Validation
summary: Implements an asynchronous validator on a signal form field using `validateHttp` to check for a unique username against a mock backend endpoint.
keywords:
  - signal forms
  - form
  - control
  - validation
  - asynchronous validation
  - async
  - validateHttp
  - schema
required_packages:
  - '@angular/forms'
  - '@angular/common'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to perform validation that requires an asynchronous operation, such as an HTTP request. It solves the problem of verifying field values against a backend or other external data source without blocking the user interface.

## When to Use

Use this pattern for validation that requires a network request. The `validateHttp` function provides a convenient, built-in way to integrate backend validation. It allows the UI to remain responsive while the validation is in progress and provides feedback to the user once the validation is complete. This is the modern, signal-based equivalent of `AsyncValidator` in `ReactiveFormsModule`.

## Key Concepts

- **`validateHttp()`:** A function used within a schema to add an asynchronous validator to a field based on an HTTP request.
- **`pending` signal:** A signal on the `FieldState` that is `true` while an asynchronous validator is running.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component that performs asynchronous validation against a mock API endpoint.

### registration-form.component.ts

This file defines the component's logic, including a schema that uses `validateHttp` to call the username validation endpoint.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, required, validateHttp, submit, Control } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';

export interface RegistrationForm {
  username: string;
}

const registrationSchema = schema<RegistrationForm>((form) => {
  required(form.username);
  validateHttp(form.username, {
    request: ({ value }) => `/api/username-check?username=${value}`,
    errors: (result: { isTaken: boolean }) => (result.isTaken ? { unique: true } : null),
  });
});

@Component({
  selector: 'app-registration-form',
  imports: [JsonPipe, Control],
  templateUrl: './registration-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationFormComponent {
  readonly submitted = output<RegistrationForm>();

  registrationModel = signal<RegistrationForm>({
    username: '',
  });

  registrationForm = form(this.registrationModel, registrationSchema);

  async handleSubmit() {
    await submit(this.registrationForm, async () => {
      this.submitted.emit(this.registrationForm().value());
    });
  }
}
```

### registration-form.component.html

This file provides the template for the form, showing how to display feedback while the asynchronous validation is pending.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>
      Username:
      <input type="text" [control]="registrationForm.username" />
    </label>
    @if (registrationForm.username().pending()) {
    <p>Checking availability...</p>
    } @if (registrationForm.username().errors().length > 0) {
    <div class="errors">
      @for (error of registrationForm.username().errors(); track error) { @if (error.required) {
      <p>Username is required.</p>
      } @else if (error.unique) {
      <p>This username is already taken.</p>
      } }
    </div>
    }
  </div>

  <button type="submit" [disabled]="registrationForm().pending()">Submit</button>
</form>
```

## Usage Notes

- The **`validateHttp`** function takes a `FieldPath` and an options object.
- The `request` function returns the URL for the validation request.
- The `errors` function maps the HTTP response to a validation error.
- The **`pending`** signal on the field state (`registrationForm.username().pending()`) can be used to show a loading indicator to the user.

## How to Use This Example

To run this example, you need to provide an `HttpClient` and a mock backend that can respond to the validation requests.

```typescript
// in app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

// A simple interceptor to mock the backend
const mockApiInterceptor = (req, next) => {
  const controller = TestBed.inject(HttpTestingController);
  const existingUsernames = ['admin', 'user', 'test'];

  if (req.url.startsWith('/api/username-check')) {
    const username = req.params.get('username');
    const isTaken = existingUsernames.includes(username?.toLowerCase() ?? '');

    // Use a timeout to simulate network latency
    setTimeout(() => {
      const mockReq = controller.expectOne(req.urlWithParams);
      mockReq.flush({ isTaken });
    }, 500);
  }

  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([mockApiInterceptor])),
    provideHttpClientTesting(),
  ],
};

// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RegistrationFormComponent, RegistrationForm } from './registration-form.component';

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
  submittedData: RegistrationForm | null = null;

  onFormSubmit(data: RegistrationForm) {
    this.submittedData = data;
    console.log('Registration data submitted:', data);
  }
}
```
