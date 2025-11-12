---
title: Conditionally Readonly Fields
summary: Demonstrates how to dynamically make a form field readonly based on the value of another field using the `readonly` function in a signal form schema.
keywords:
  - signal forms
  - dynamic forms
  - conditional fields
  - readonly
  - schema
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to control user input by making certain fields non-editable based on the form's state. It solves the problem of preventing users from editing fields that are conditionally immutable, such as locking a "shipping address" field when a "same as billing" checkbox is checked.

## When to Use

Use this pattern when you need to prevent user input in a field without completely disabling it. A `readonly` field remains focusable and its value is still included in the parent form's value, unlike a `disabled` field. This is useful for displaying information that is part of the form's data model but should not be edited by the user in certain contexts.

## Key Concepts

- **`readonly()`:** A function used within a schema to define the logic that determines whether a field should be readonly. It takes a `FieldPath` and a predicate function.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.
- **`readonly` signal:** A signal on the `FieldState` that reflects the field's readonly status, which can be used for attribute binding in the template.

## Example Files

This example consists of a standalone component that defines and manages a form with a conditionally readonly field.

### address-form.component.ts

This file defines the component's logic, including a schema that uses the `readonly` function to control the state of the shipping address fields.

```typescript
import { Component, signal, output, ChangeDetectionStrategy, effect } from '@angular/core';
import { form, schema, readonly, submit } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';

export interface AddressForm {
  billingAddress: string;
  useBillingForShipping: boolean;
  shippingAddress: string;
}

const addressSchema = schema<AddressForm>((form) => {
  // The `shippingAddress` field is readonly if `useBillingForShipping` is true.
  readonly(form.shippingAddress, ({ valueOf }) => valueOf(form.useBillingForShipping));
});

@Component({
  selector: 'app-address-form',
  imports: [JsonPipe],
  templateUrl: './address-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFormComponent {
  readonly submitted = output<AddressForm>();

  addressModel = signal<AddressForm>({
    billingAddress: '123 Main St',
    useBillingForShipping: true,
    shippingAddress: '123 Main St', // Initially synced
  });

  addressForm = form(this.addressModel, addressSchema);

  constructor() {
    // Effect to sync addresses when the checkbox is checked
    effect(() => {
      if (this.addressForm.useBillingForShipping().value()) {
        const billing = this.addressForm.billingAddress().value();
        this.addressForm.shippingAddress().value.set(billing);
      }
    });
  }

  async handleSubmit() {
    await submit(this.addressForm, async () => {
      this.submitted.emit(this.addressForm().value());
    });
  }
}
```

### address-form.component.html

This file provides the template for the form, binding an input's `readonly` attribute to its corresponding field's `readonly` signal.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>Billing Address:</label>
    <input type="text" [control]="addressForm.billingAddress" />
  </div>

  <div>
    <label>
      <input type="checkbox" [control]="addressForm.useBillingForShipping" />
      Shipping address is the same as billing
    </label>
  </div>

  <div>
    <label>Shipping Address:</label>
    <input
      type="text"
      [control]="addressForm.shippingAddress"
      [readonly]="addressForm.shippingAddress().readonly()"
    />
  </div>

  <button type="submit">Submit</button>
</form>
```

## Usage Notes

- The `readonly()` function in the schema controls the `readonly` signal of the `shippingAddress` field.
- The text input's `readonly` attribute is bound to this signal: `[readonly]="addressForm.shippingAddress().readonly()"`.
- An `effect` is used to synchronize the value from the billing address to the shipping address when the checkbox is checked, as `readonly` only prevents user input, it does not manage the field's value.

## How to Use This Example

The parent component listens for the `(submitted)` event to receive the form data.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { AddressFormComponent, AddressForm } from './address-form.component';

@Component({
  selector: 'app-root',
  imports: [AddressFormComponent, JsonPipe],
  template: `
    <h1>Address Information</h1>
    <app-address-form (submitted)="onFormSubmit($event)"></app-address-form>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: AddressForm | null = null;

  onFormSubmit(data: AddressForm) {
    this.submittedData = data;
    console.log('Address data submitted:', data);
  }
}
```
