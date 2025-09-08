---
title: Third-Party Validator Integration (Zod)
summary: Demonstrates how to validate a signal form using a third-party library like Zod by leveraging the `validateStandardSchema` function.
keywords:
  - signal forms
  - validation
  - zod
  - third-party
  - integration
  - validateStandardSchema
  - schema
required_packages:
  - '@angular/forms'
  - 'zod'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to reuse existing validation logic from third-party libraries, especially those that adhere to the `Standard-Schema` specification. It solves the problem of having to rewrite and maintain separate validation rules for your frontend and backend by allowing you to use a single, shared schema (like one from Zod).

## When to Use

Use this pattern when you have an existing validation schema from a compatible library like Zod, or when you want to share validation logic between your Angular application and a server. This is ideal for ensuring data consistency across your entire stack.

## Key Concepts

- **`validateStandardSchema()`:** A function that integrates a `Standard-Schema` compatible validator (like a Zod schema) into your signal form's validation process.
- **Zod:** A popular TypeScript-first schema declaration and validation library. Zod schemas can be used with signal forms via a compatibility layer.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component and a file containing a Zod schema.

### registration.zod.ts

This file defines a Zod schema for the registration form, which can be shared between a client and server.

```typescript
import { z } from 'zod';

export const registrationZodSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], // Path of error
  });

export type RegistrationData = z.infer<typeof registrationZodSchema>;
```

### registration-form.component.ts

This file defines the component, which imports the Zod schema and applies it to the form using `validateStandardSchema`.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, validateStandardSchema, submit } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';
import { registrationZodSchema, RegistrationData } from './registration.zod';

const registrationSchema = schema<RegistrationData>((form) => {
  validateStandardSchema(form, registrationZodSchema);
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
    email: '',
    password: '',
    confirmPassword: '',
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

This file provides the template for the form, displaying validation errors that originate from the Zod schema.

```html
<form (submit)="handleSubmit(); $event.preventDefault()">
  <div>
    <label>Email:</label>
    <input type="email" [control]="registrationForm.email" />
    @if (registrationForm.email().errors().length > 0) {
    <div class="errors">
      <p>Please enter a valid email.</p>
    </div>
    }
  </div>

  <div>
    <label>Password:</label>
    <input type="password" [control]="registrationForm.password" />
    @if (registrationForm.password().errors().length > 0) {
    <div class="errors">
      <p>Password must be at least 8 characters.</p>
    </div>
    }
  </div>

  <div>
    <label>Confirm Password:</label>
    <input type="password" [control]="registrationForm.confirmPassword" />
    @if (registrationForm.confirmPassword().errors().length > 0) {
    <div class="errors">
      <p>Passwords don't match.</p>
    </div>
    }
  </div>

  <button type="submit" [disabled]="!registrationForm().valid()">Register</button>
</form>
```

## Usage Notes

- The `validateStandardSchema` function automatically maps errors from the Zod schema to the corresponding fields in the signal form.
- This includes cross-field validation, as demonstrated by the `.refine` method in the Zod schema, which correctly attaches the error to the `confirmPassword` field.
- The TypeScript type for the form data can be inferred directly from the Zod schema using `z.infer`, ensuring type safety.

## How to Use This Example

### 1. Create the Schema and Component Files

Create the following three files and copy the code from the examples above:

- `registration.zod.ts`
- `registration-form.component.ts`
- `registration-form.component.html`

### 2. Use the Form Component

The parent component listens for the `(submitted)` event to receive the Zod-validated form data.

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
    console.log('Registration data submitted:', data);
  }
}
```
