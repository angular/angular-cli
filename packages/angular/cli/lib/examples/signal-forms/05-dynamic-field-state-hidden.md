---
title: Dynamic Field State with `hidden`
summary: Demonstrates how to dynamically show and hide a form field based on the value of another field using the `hidden` function in a signal form schema.
keywords:
  - signal forms
  - dynamic forms
  - conditional fields
  - hidden
  - schema
required_packages:
  - '@angular/forms'
related_concepts:
  - 'signals'
experimental: true
---

## Purpose

The purpose of this pattern is to create dynamic forms that adapt to user input in real-time. It solves the problem of cluttered UIs by conditionally displaying fields only when they are relevant, based on the values of other fields in the form.

## When to Use

Use this pattern when you need to show or hide a form control based on another control's value. A classic example is an "Other" option in a dropdown that, when selected, reveals a text input for the user to specify their reason. When a field is hidden, its value and validation status do not affect the parent form's state.

## Key Concepts

- **`hidden()`:** A function used within a schema to define the logic that determines whether a field should be hidden. It takes a `FieldPath` and a predicate function.
- **`submit()`:** An async helper function that manages the form's submission state and should be called from the submit event handler.
- **`@if` block:** Used in the template to conditionally render the form control based on the field's `hidden` signal.

## Example Files

This example consists of a standalone component that defines and manages a contact form with a dynamically visible field.

### contact-form.component.ts

This file defines the component's logic, including a schema that uses the `hidden` function to control field visibility.

```typescript
import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { form, schema, hidden, required, submit, Control } from '@angular/forms/signals';
import { JsonPipe } from '@angular/common';

export interface ContactForm {
  reason: 'question' | 'feedback' | 'other';
  otherReason: string;
}

const contactSchema = schema<ContactForm>((form) => {
  // The `otherReason` field is hidden unless the reason is 'other'.
  hidden(form.otherReason, ({ valueOf }) => valueOf(form.reason) !== 'other');

  // The `otherReason` field is required only when it is visible.
  required(form.otherReason, ({ valueOf }) => valueOf(form.reason) === 'other');
});

@Component({
  selector: 'app-contact-form',
  imports: [JsonPipe, Control],
  templateUrl: './contact-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  readonly submitted = output<ContactForm>();

  contactModel = signal<ContactForm>({
    reason: 'question',
    otherReason: '',
  });

  contactForm = form(this.contactModel, contactSchema);

  async handleSubmit() {
    await submit(this.contactForm, async () => {
      this.submitted.emit(this.contactForm().value());
    });
  }
}
```

### contact-form.component.html

This file provides the template for the form, using an `@if` block to conditionally render a field based on its `hidden` signal.

```html
<form (submit)="handleSubmit(); $event.preventDefault()" novalidate>
  <div>
    <label>Reason for Contact:</label>
    <select [control]="contactForm.reason">
      <option value="question">Question</option>
      <option value="feedback">Feedback</option>
      <option value="other">Other</option>
    </select>
  </div>

  @if (!contactForm.otherReason().hidden()) {
  <div>
    <label>Please specify:</label>
    <input type="text" [control]="contactForm.otherReason" />
    @if (contactForm.otherReason().errors().length > 0) {
    <div class="errors">
      <p>This field is required when reason is "Other".</p>
    </div>
    }
  </div>
  }

  <button type="submit">Submit</button>
</form>
```

## Usage Notes

- The `hidden` function controls the field's `hidden` state signal. It does **not** automatically hide the element in the DOM.
- You must use a conditional block like `@if (!myField().hidden())` in the template to manage the element's visibility.
- When a field is hidden, its validation errors are ignored, and its value is excluded from the parent's value calculation. This is why the `required` validator on `otherReason` only triggers when the field is visible.

## How to Use This Example

The parent component listens for the `(submitted)` event to receive the form data.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ContactFormComponent, ContactForm } from './contact-form.component';

@Component({
  selector: 'app-root',
  imports: [ContactFormComponent, JsonPipe],
  template: `
    <h1>Contact Us</h1>
    <app-contact-form (submitted)="onFormSubmit($event)"></app-contact-form>

    @if (submittedData) {
      <h2>Submitted Data:</h2>
      <pre>{{ submittedData | json }}</pre>
    }
  `,
})
export class AppComponent {
  submittedData: ContactForm | null = null;

  onFormSubmit(data: ContactForm) {
    this.submittedData = data;
    console.log('Contact data submitted:', data);
  }
}
```
