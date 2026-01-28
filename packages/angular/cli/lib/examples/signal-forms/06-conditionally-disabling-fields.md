---
title: Conditionally Disabling Fields
summary: Demonstrates how to dynamically disable a form field based on the value of another field using the `disabled` function in a signal form schema.
keywords:
  - signal forms
  - dynamic forms
  - conditional fields
  - disabled
  - schema
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to guide users through a form by controlling which fields are interactive. It solves the problem of preventing users from interacting with fields that are not relevant until a specific condition is met, such as checking a box to enable an optional field.

## When to Use

Use this pattern whenever you need to enable or disable a form control based on the state of another. This is essential for creating clear, guided user workflows. When a field is disabled, its value is excluded from the parent form's value and its validation status is ignored, which is useful for optional fields that should only be included when explicitly enabled by the user.

## Key Concepts

- **`disabled()`:** A function used within a schema to define the logic that determines whether a field should be disabled. It takes a `FieldPath` and a predicate function.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.
- **`disabled` signal:** A signal on the `FieldState` that reflects the field's disabled status, which can be used for attribute binding in the template.

## Example Files

This example consists of a standalone component that defines and manages a form with a conditionally disabled field.

### promo-form.component.ts

This file defines the component's logic, including a schema that uses the `disabled` function to control the enabled state of a field.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, disabled, required, submit, Control } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';

export interface PromoData {
  hasPromoCode: boolean;
  promoCode: string;
}

const promoSchema = schema<PromoData>((form) => {
  // The `promoCode` field is disabled if `hasPromoCode` is false.
  disabled(form.promoCode, ({ valueOf }) => !valueOf(form.hasPromoCode));

  // The `promoCode` is required only if it's enabled.
  required(form.promoCode, ({ valueOf }) => valueOf(form.hasPromoCode));
});

@Component({
  selector: 'app-promo-form',
  imports: [JsonPipe, Control],
  templateUrl: './promo-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoFormComponent {
  readonly submitted = output<PromoData>();

  promoModel = signal<PromoData>({
    hasPromoCode: false,
    promoCode: '',
  });

  promoForm = form(this.promoModel, promoSchema);

  async handleSubmit() {
    await submit(this.promoForm, async () => {
      this.submitted.emit(this.promoForm().value());
    });
  }
}
```

### promo-form.component.html

This file provides the template for the form, binding an input's `disabled` attribute to its corresponding field's `disabled` signal.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>
      <input type="checkbox" [control]="promoForm.hasPromoCode" />
      I have a promotional code
    </label>
  </div>

  <div>
    <label>Promotional Code:</label>
    <input
      type="text"
      [control]="promoForm.promoCode"
      [disabled]="promoForm.promoCode().disabled()"
    />
    @if (promoForm.promoCode().errors().length > 0) {
    <div class="errors">
      <p>Promo code is required.</p>
    </div>
    }
  </div>

  <button type="submit">Apply</button>
</form>
```

## Usage Notes

- The `disabled()` function in the schema controls the `disabled` signal of the `promoCode` field.
- The text input's `disabled` attribute is bound to this signal: `[disabled]="promoForm.promoCode().disabled()"`.
- When `hasPromoCode` is `false`, the `promoCode` field becomes disabled. A disabled field's value is not included in the parent form's value, and its validators are not run.

## How to Use This Example

The parent component listens for the `(submitted)` event to receive the form data.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { PromoFormComponent, PromoData } from './promo-form.component';

@Component({
  selector: 'app-root',
  imports: [PromoFormComponent, JsonPipe],
  template: `
    <h1>Promotional Code</h1>
    <app-promo-form (submitted)="onFormSubmit($event)"></app-promo-form>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: PromoData | null = null;

  onFormSubmit(data: PromoData) {
    this.submittedData = data;
    console.log('Promo data submitted:', data);
  }
}
```
