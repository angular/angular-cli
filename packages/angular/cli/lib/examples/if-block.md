---
title: 'Using the @if Built-in Control Flow Block'
summary: 'Demonstrates how to use the @if built-in control flow block to conditionally render content in an Angular template based on a boolean expression.'
keywords:
  - '@if'
  - 'control flow'
  - 'conditional rendering'
  - 'template syntax'
related_concepts:
  - '@else'
  - '@else if'
  - 'signals'
related_tools:
  - 'modernize'
---

## Purpose

The purpose of this pattern is to create dynamic user interfaces by controlling which elements are rendered to the DOM based on the application's state. This is a fundamental technique for building responsive and interactive components.

## When to Use

Use the `@if` block as the modern, preferred alternative to the `*ngIf` directive for all conditional rendering. It offers better type-checking and a cleaner, more intuitive syntax within the template.

## Key Concepts

- **`@if` block:** The primary syntax for conditional rendering in modern Angular templates. It evaluates a boolean expression and renders the content within its block if the expression is true.

## Example Files

### `conditional-content.component.ts`

This is a self-contained standalone component that demonstrates the `@if` block with an optional `@else` block.

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-conditional-content',
  template: `
    <button (click)="toggleVisibility()">Toggle Content</button>

    @if (isVisible()) {
      <div>This content is conditionally displayed.</div>
    } @else {
      <div>The content is hidden. Click the button to show it.</div>
    }
  `,
})
export class ConditionalContentComponent {
  protected readonly isVisible = signal(true);

  toggleVisibility(): void {
    this.isVisible.update((v) => !v);
  }
}
```

## Usage Notes

- The expression inside the `@if ()` block must evaluate to a boolean.
- This example uses a signal, which is a common pattern, but any boolean property or method call from the component can be used.
- The `@else` block is optional and is rendered when the `@if` condition is `false`.

## How to Use This Example

### 1. Import the Component

In a standalone architecture, import the component into the `imports` array of the parent component where you want to use it.

```typescript
// in app.component.ts
import { Component } from '@angular/core';
import { ConditionalContentComponent } from './conditional-content.component';

@Component({
  selector: 'app-root',
  imports: [ConditionalContentComponent],
  template: `
    <h1>My Application</h1>
    <app-conditional-content></app-conditional-content>
  `,
})
export class AppComponent {}
```
