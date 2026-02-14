---
title: Menu Trigger
summary: Demonstrates how to use the ngMenuTrigger directive to create a standalone menu.
keywords:
  - MenuTrigger
  - Menu
  - MenuItem
  - ngMenu
  - ngMenuItem
  - ngMenuTrigger
required_packages:
  - '@angular/aria/menu'
related_concepts:
  - 'Accessibility'
  - 'A11y'
  - 'UI Patterns'
  - 'Aria'
experimental: true
---

## Purpose

The `ngMenuTrigger` directive is a key part of the `@angular/aria/menu` module, allowing you to create standalone menus. This is a common UI pattern for context menus, action menus, or any other menu that is opened by a button click.

## When to Use

Use the `ngMenuTrigger` directive when you need to create a dropdown menu by using the trigger button with a menu. This is ideal for situations where you have a single button that needs to open a list of options for application menus (File, Edit), toolbar dropdowns, or settings. Avoid this for navigation, data entry, or content organization; instead, utilize Navigation landmarks for site structure, the select combobox component for form select, and Tabs or Accordions for switching or collapsing content panels.

## Key Concepts

- **Menu**: A directive that applies the `menu` ARIA role. It represents the actual dropdown menu content.
- **MenuItem**: A directive that applies the `menuitem` ARIA role. It represents an individual, actionable item within a menu.
- **MenuTrigger**: A directive used to connect a trigger element (e.g., a button) to an `ng-template` that contains the `ngMenu` to be opened.
- **OverlayModule**: A directive from the Angular CDK used to display a popup menu of menuitems.

## Example Files

This example demonstrates a simple menu trigger that opens a menu of actions.

### menu-trigger-example.ts

This file defines the menu trigger component.

```typescript
import { Component, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { Menu, MenuItem, MenuTrigger, MenuContent } from '@angular/aria/menu';

@Component({
  selector: 'menu-trigger-example',
  templateUrl: 'menu-trigger-example.html',
  styleUrls: ['menu-trigger-example.css'],
  imports: [Menu, MenuItem, MenuTrigger, MenuContent, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuTriggerExample {
  optionMenu = viewChild<Menu<string>>('optionMenu');
}
```

### menu-trigger-example.html

This template structures the menu trigger and its corresponding menu.

```html
<button #origin ngMenuTrigger #trigger="ngMenuTrigger" [menu]="optionMenu()" aria-label="Open Menu">
  <span>Menu</span>
</button>
<ng-template
  [cdkConnectedOverlayOpen]="trigger.expanded()"
  [cdkConnectedOverlay]="{origin, usePopover: 'inline'}"
  [cdkConnectedOverlayPositions]="[{originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4}]"
>
  <div ngMenu #optionMenu="ngMenu">
    <ng-template ngMenuContent>
      <div ngMenuItem value="Option 1">Option 1</div>
      <div ngMenuItem value="Option 2">Option 2</div>
      <div ngMenuItem value="Option 3">Option 3</div>
    </ng-template>
  </div>
</ng-template>
```

### menu-trigger-example.css

This file provides basic styling for the menu trigger.

```css
[ngMenuTrigger] {
  padding: 0.6rem 2rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

[ngMenu] {
  margin: 0;
  width: 10rem;
  padding: 0.25rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

[ngMenuItem] {
  display: flex;
  cursor: pointer;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.875rem;
  border-radius: 0.25rem;
  outline: none;
}

[ngMenuTrigger]:hover,
[ngMenuItem][data-active='true'] {
  background: #eaeaea;
}

[ngMenuItem]:focus {
  outline: 2px solid #4285f4;
}
```

## Usage Notes

- The `ngMenuTrigger` directive is applied to a `button` element, and its value is set to the `ng-template` that contains the `ngMenu`. `ngMenu` is a required part of the `ngMenuTrigger`.
- Add `disabled` to menu items in order to disable the menuitems.
- Add `wrap` whether you want the keyboard to wrap around at the edges.
- Nested menus are created by adding submenus using the `[submenu]="subMenuRef()"` on a `ngMenuItem`.
- Use the `cdkConnectedOverlay` to use the popover api and defer the content using `ngMenuContent`.
