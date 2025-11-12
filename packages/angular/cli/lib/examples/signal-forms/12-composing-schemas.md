---
title: Composing Schemas in Signal Forms
summary: Organizes complex validation logic by creating modular, reusable schemas and composing them into a larger form schema using the `apply()` function.
keywords:
  - signal forms
  - validation
  - schema
  - compose
  - apply
  - submit
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to manage validation logic for large, complex forms in a scalable and maintainable way. It solves the problem of monolithic, hard-to-read validation schemas by breaking them down into smaller, domain-specific schemas that can be independently developed, tested, and reused.

## When to Use

Use this pattern for any form that has distinct subgroups of fields, such as a user profile form that includes separate sections for personal details and address information. Composing schemas is the best practice for keeping your validation logic organized and avoiding massive, unmanageable schema definitions.

## Key Concepts

- **`schema()`:** A function used to define a modular piece of validation logic for a specific data structure.
- **`apply()`:** A function used within a parent schema to import and apply a smaller, predefined schema to a specific field group.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.

## Example Files

This example consists of a standalone component and a file containing a reusable, domain-specific schema.

### address.schema.ts

This file defines a reusable schema for a specific data structure (an address).

```typescript
import { schema, validate } from '@angular/forms/signals';

export interface Address {
  street: string;
  city: string;
  zipCode: string;
}

export const addressSchema = schema<Address>((address) => {
  validate(address.street, ({ value }) => (value() === '' ? { required: true } : null));
  validate(address.city, ({ value }) => (value() === '' ? { required: true } : null));
  validate(address.zipCode, ({ value }) => {
    if (value() === '') return { required: true };
    if (!/^\d{5}$/.test(value())) return { pattern: true };
    return null;
  });
});
```

### registration-form.component.ts

This file defines the main component, which imports the address schema and composes it into the main form schema using `apply()`.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, validate, apply, submit } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';
import { Address, addressSchema } from './address.schema';

export interface RegistrationForm {
  name: string;
  address: Address;
}

const registrationSchema = schema<RegistrationForm>((form) => {
  validate(form.name, ({ value }) => (value() === '' ? { required: true } : null));

  // Apply the external address schema to the address field.
  apply(form.address, addressSchema);
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
    name: '',
    address: {
      street: '',
      city: '',
      zipCode: '',
    },
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

This file provides the template for the form, binding to the nested fields of the composed schema.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>
      Name:
      <input type="text" [control]="registrationForm.name" />
    </label>
    @if (registrationForm.name().errors().length > 0) {
    <div class="errors"><p>Name is required.</p></div>
    }
  </div>

  <fieldset>
    <legend>Address</legend>
    <div>
      <label>
        Street:
        <input type="text" [control]="registrationForm.address.street" />
      </label>
      @if (registrationForm.address.street().errors().length > 0) {
      <div class="errors"><p>Street is required.</p></div>
      }
    </div>
    <div>
      <label>
        City:
        <input type="text" [control]="registrationForm.address.city" />
      </label>
      @if (registrationForm.address.city().errors().length > 0) {
      <div class="errors"><p>City is required.</p></div>
      }
    </div>
    <div>
      <label>
        Zip Code:
        <input type="text" [control]="registrationForm.address.zipCode" />
      </label>
      @if (registrationForm.address.zipCode().errors().length > 0) {
      <div class="errors">
        @for(error of registrationForm.address.zipCode().errors()) { @if (error.required) {
        <p>Zip Code is required.</p>
        } @if (error.pattern) {
        <p>Zip Code must be 5 digits.</p>
        } }
      </div>
      }
    </div>
  </fieldset>

  <button type="submit">Submit</button>
</form>
```

## Usage Notes

- The `addressSchema` is defined in its own file, making it portable and easy to test in isolation.
- The `apply()` function is used in the main `registrationSchema` to mount the `addressSchema` onto the `address` property of the form.

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
