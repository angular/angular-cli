---
title: Menu Bar
summary: Demonstrates how to create an accessible menu bar with nested menus using @angular/aria/menu directives.
keywords:
  - Menu Bar
  - Menu
  - MenuItem
  - ngMenuBar
  - ngMenu
  - ngMenuItem
required_packages:
  - '@angular/aria/menu'
  - '@angular/cdk/overlay'
related_concepts:
  - 'Accessibility'
  - 'A11y'
  - 'Navigation'
  - 'UI Patterns'
  - 'Aria'
experimental: true
---

## Purpose

The `@angular/aria/menu` module provides a set of directives for an accessible menu experiences. Menubars organize commands for application navigation or contextual actions, offering a structured way to present a list of commands or options to the user.

## When to Use

Menubars are effective for creating persistent, horizontal navigation that organizes application commands into logical, discoverable categories like "File" or "Edit" making them ideal for desktop-style interfaces. You should use them when you need a stable top-level structure that remains visible across the application, but you should avoid them for simple standalone action lists, context menus, or mobile interfaces where horizontal space is constrained; in those cases, standard menus, trigger-based dropdowns, or sidebar navigation patterns are more appropriate.

## Key Concepts

- **MenuBar**: A directive that applies the `menubar` ARIA role to its host element. It acts as a container for top-level menus.
- **Menu**: A directive that applies the `menu` ARIA role. It represents the actual dropdown menu content.
- **MenuItem**: A directive that applies the `menuitem` ARIA role. It represents an individual, actionable item within a menu.
- **OverlayModule**: A directive from the Angular CDK used to display a popup menu of menuitems.

## Example Files

This example demonstrates a simple menu bar with nested menus for file operations.

### menu-bar-example.ts

This file defines the menubar component example.

```typescript
import { Component, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { Menu, MenuBar, MenuItem, MenuContent } from '@angular/aria/menu';

@Component({
  selector: 'menu-bar-example',
  templateUrl: 'menu-bar-example.html',
  styleUrls: ['menu-bar-example.css'],
  imports: [Menu, MenuBar, MenuItem, MenuContent, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuBarExample {
  fileMenu = viewChild<Menu<string>>('fileMenu');
  editMenu = viewChild<Menu<string>>('editMenu');
}
```

### menu-bar-example.html

This template structures the menu bar and its nested menus. It utilizes the `cdkConnectedOverlay` and popover API.

```html
<div ngMenuBar (focusin)="onFocusIn()">
  <div ngMenuItem #fileItem value="File" [submenu]="fileMenu()">File</div>
  <ng-template
    [cdkConnectedOverlay]="{origin: fileItem, usePopover: 'inline'}"
    [cdkConnectedOverlayPositions]="[{originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4}]"
    [cdkConnectedOverlayOpen]="rendered()"
  >
    <div ngMenu #fileMenuElement #fileMenu="ngMenu">
      <ng-template ngMenuContent>
        <div ngMenuItem value="New">New</div>
        <div ngMenuItem value="Open">Open</div>
        <div ngMenuItem value="Exit">Exit</div>
      </ng-template>
    </div>
  </ng-template>

  <div ngMenuItem #editItem value="Edit" [submenu]="editMenu()">Edit</div>
  <ng-template
    [cdkConnectedOverlay]="{origin: editItem, usePopover: 'inline'}"
    [cdkConnectedOverlayPositions]="[{originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4}]"
    [cdkConnectedOverlayOpen]="true"
  >
    <div ngMenu #editMenuElement #editMenu="ngMenu">
      <ng-template ngMenuContent>
        <div ngMenuItem value="Cut">Cut</div>
        <div ngMenuItem value="Copy">Copy</div>
        <div ngMenuItem value="Paste">Paste</div>
      </ng-template>
    </div>
  </ng-template>
</div>
```

### menu-bar-example.css

This file provides basic styling for the menu bar and menus.

```css
[ngMenuBar] {
  display: flex;
  cursor: pointer;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 0.5rem;
  width: fit-content;
  background: white;
  border: 1px solid lightgrey;
}

[ngMenu] {
  margin: 0;
  width: 5rem;
  padding: 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

[ngMenu][data-visible='false'] {
  display: none;
}

[ngMenuItem] {
  cursor: pointer;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.875rem;
  outline: none;
}

[ngMenuItem][data-active='true']:focus-within,
[ngMenuItem][data-active='true']:hover,
[ngMenuItem][data-active='true'][aria-expanded='true'] {
  background: #eaeaea;
}

[ngMenuItem]:hover,
[ngMenuItem]:focus {
  outline: 2px solid #4285f4;
  border-radius: 0.5rem;
}
```

## Usage Notes

- The `ngMenuBar` directive is applied to the main container, establishing the ARIA `menubar` role.
- Control the direction for RTL support by setting `dir="rtl"` on `ngMenuBar`.
- Nested menus are created by adding submenus using the `[submenu]="subMenuRef()"` on a `ngMenuItem`.
- Add `disabled` to menu items in order to disable the menu items.
- Use the `cdkConnectedOverlay` to use the popover api and defer the content using `ngMenuContent`.
