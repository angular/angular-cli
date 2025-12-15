---
title: Toolbar
summary: Demonstrates how to create an accessible toolbar with widgets and widget groups using @angular/aria/toolbar directives.
keywords:
  - Toolbar
  - ToolbarWidget
  - ToolbarWidgetGroup
  - ngToolbar
  - ngToolbarWidget
  - ngToolbarWidgetGroup
required_packages:
  - '@angular/aria/toolbar'
related_concepts:
  - 'Accessibility'
  - 'A11y'
  - 'UI Patterns'
  - 'Aria'
experimental: true
---

## Purpose

The `@angular/aria/toolbar` module provides directives for building accessible toolbars. A toolbar is a container for a group of widgets (like buttons, toggles, radio groups) that provide quick access to common actions or controls.

## When to Use

Use the Angular Aria toolbar directives when you need to group related controls or actions in a visually distinct and accessible bar. This is common in applications with rich editing features, document viewers, or any interface where users frequently interact with a set of tools. It helps organize the UI and provides a consistent way for users to access functionality. Toolbars should be avoided for where a simple button group is sufficient, unrelated controls, or a complex nested hiearchies are needed.

## Key Concepts

- **Toolbar**: The main container directive for the toolbar. It applies the `toolbar` ARIA role and manages navigation between its widgets.
- **ToolbarWidget**: A directive applied to individual interactive elements (e.g., buttons, inputs) within the toolbar. It makes the element a navigable widget within the toolbar's focus management system.
- **ToolbarWidgetGroup**: A directive used to group related `ngToolbarWidget` elements. This is useful for complex widgets like radio groups or sets of related buttons that should be navigated as a single unit within the toolbar.

## Example Files

This example demonstrates a simple toolbar with action buttons and a grouped set of alignment options.

### toolbar-example.ts

This file defines the toolbar component.

```typescript
import { Component, signal } from '@angular/core';
import {
  Toolbar as NgToolbar,
  ToolbarWidget as NgToolbarWidget,
  ToolbarWidgetGroup as NgToolbarWidgetGroup,
} from '@angular/aria/toolbar';

@Component({
  selector: 'toolbar-example',
  templateUrl: 'toolbar-example.html',
  styleUrls: ['toolbar-example.css'],
  imports: [Toolbar, ToolbarWidget, ToolbarWidgetGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarExample {}
```

### toolbar-example.html

This template structures the toolbar with buttons and a widget group.

```html
<div ngToolbar aria-label="Toolbar Text Formatting Tools">
  <div class="group" aria-label="Undo and Redo options">
    <button class="material-symbols-outlined" ngToolbarWidget aria-label="undo" value="undo">
      undo
    </button>
    <button class="material-symbols-outlined" ngToolbarWidget aria-label="redo" value="redo">
      redo
    </button>
  </div>

  <div class="separator"></div>

  <div class="group" aria-label="Text formatting options">
    <button
      class="material-symbols-outlined"
      ngToolbarWidget
      [aria-label]="button1.value()"
      [aria-pressed]="button1.selected()"
      #button1="ngToolbarWidget"
      value="bold"
    >
      format_bold
    </button>
    <button
      class="material-symbols-outlined"
      ngToolbarWidget
      [aria-label]="button2.value()"
      [aria-pressed]="button2.selected()"
      #button2="ngToolbarWidget"
      value="italic"
    >
      format_italic
    </button>
    <button
      class="material-symbols-outlined"
      ngToolbarWidget
      [aria-label]="button3.value()"
      [aria-pressed]="button3.selected()"
      #button3="ngToolbarWidget"
      value="underline"
    >
      format_underlined
    </button>
  </div>

  <div class="separator"></div>

  <div class="group" ngToolbarWidgetGroup role="radiogroup" aria-label="Alignment options">
    <button
      role="radio"
      class="material-symbols-outlined"
      ngToolbarWidget
      [aria-label]="radio1.value()"
      [aria-checked]="radio1.selected()"
      #radio1="ngToolbarWidget"
      value="align left"
    >
      format_align_left
    </button>
    <button
      role="radio"
      class="material-symbols-outlined"
      ngToolbarWidget
      [aria-label]="radio2.value()"
      [aria-checked]="radio2.selected()"
      #radio2="ngToolbarWidget"
      value="align center"
    >
      format_align_center
    </button>
    <button
      role="radio"
      class="material-symbols-outlined"
      ngToolbarWidget
      [aria-label]="radio3.value()"
      [aria-checked]="radio3.selected()"
      #radio3="ngToolbarWidget"
      value="align right"
    >
      format_align_right
    </button>
  </div>
</div>
```

### toolbar-example.css

This file provides basic styling for the toolbar.

```css
@import url('https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined');

:host {
  border: 1px solid black;
  border-radius: 0.5rem;
  display: block;
  width: fit-content;
}

[ngToolbar] {
  gap: 1.5rem;
  padding: 0.5rem 1rem;
  display: flex;
}

.group {
  gap: 0.5rem;
  display: flex;
}

.separator {
  width: 1px;
  background: black;
}

button {
  cursor: pointer;
  opacity: 0.875;
  font-size: 1.25rem;
  border-radius: 0.5rem;
  padding: 0.5rem;
  background-color: transparent;
  border: 1px solid transparent;
}

button:focus {
  outline: 2px solid #4285f4;
}

button:focus,
button:hover,
button:active {
  background: #e8f0fe;
}

button[aria-pressed='true'],
button[aria-checked='true'] {
  color: darkblue;
  background: #e8f0fe;
}
```

## Usage Notes

- The `ngToolbar` directive is applied to the main container, establishing the ARIA `toolbar` role.
- Control the direction for RTL support by setting `dir="rtl"` on `ngToolbar`.
- Individual action buttons are marked with `ngToolbarWidget`. `[value]` input is required.
- A group of related controls, such as alignment options, can be wrapped in an `ngToolbarWidgetGroup`.
- The `multi` input of `ngToolbarWidgetGroup` controls whether multiple widgets within teh group can be selected simultaneously.
