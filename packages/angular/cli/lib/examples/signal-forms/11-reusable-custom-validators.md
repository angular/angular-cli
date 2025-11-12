---
title: Reusable Custom Validators in Signal Forms
summary: Defines a reusable, configurable validator function and applies it within a signal form schema to promote modular and testable validation logic.
keywords:
  - signal forms
  - validation
  - custom validator
  - reusable
  - schema
  - validate
  - submit
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to create modular, reusable, and configurable validation logic. It solves the problem of code duplication and poor testability that can arise from defining complex validation inline within a component's schema definition.

## When to Use

Use this pattern when you have validation logic that is shared across multiple forms or is complex enough to benefit from being in its own dedicated, testable function. This is the best practice for any validator beyond a simple, one-off check.

## Key Concepts

- **Validator Function:** A standalone function that takes configuration (like a minimum length) and returns a validation function that can be used with `validate`.
- **Factory Pattern:** Using a higher-order function to create and configure your validator, making it highly reusable.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component and a file containing a reusable validator function.

### custom-validators.ts

This file defines a reusable, configurable `minLength` validator factory.

```typescript
import { FieldValidator } from '@angular/forms/signals';

export function minLength(minLength: number): FieldValidator<string> {
  return ({ value }) => {
    if (value().length < minLength) {
      return { minLength: { requiredLength: minLength, actualLength: value().length } };
    }
    return null;
  };
}
```

### registration-form.component.ts

This file defines the component's logic, importing and using the reusable validator within its form schema.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, validate, submit } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';
import { minLength } from './custom-validators';

export interface RegistrationForm {
  username: string;
  password: string;
}

const registrationSchema = schema<RegistrationForm>((form) => {
  validate(form.username, minLength(5));
  validate(form.password, minLength(8));
});

@Component({
  selector: 'app-registration-form',
  imports: [JsonPipe],
  templateUrl: './registration-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationFormComponent {
  readonly submitted = output<RegistrationForm>();

  registrationModel = signal<RegistrationForm>({
    username: '',
    password: '',
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

This file provides the template for the form, displaying detailed error messages from the custom validator.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>
      Username:
      <input type="text" [control]="registrationForm.username" />
    </label>
    @if (registrationForm.username().errors().length > 0) {
    <div class="errors">
      @for (error of registrationForm.username().errors()) { @if (error.minLength) {
      <p>Username must be at least {{ error.minLength.requiredLength }} characters long.</p>
      } }
    </div>
    }
  </div>
  <div>
    <label>
      Password:
      <input type="password" [control]="registrationForm.password" />
    </label>
    @if (registrationForm.password().errors().length > 0) {
    <div class="errors">
      @for (error of registrationForm.password().errors()) { @if (error.minLength) {
      <p>Password must be at least {{ error.minLength.requiredLength }} characters long.</p>
      } }
    </div>
    }
  </div>

  <button type="submit">Submit</button>
</form>
```

## Usage Notes

- The `minLength` function is a factory that returns the actual validator function. This makes it configurable and reusable.
- The error object contains rich information (`requiredLength`, `actualLength`) for generating specific user feedback.

## How to Use This Example

The parent component listens for the `(submitted)` event and receives the strongly-typed form data.

```typescript
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
