---
title: Tabs
summary: Demonstrates how to create an accessible tabbed interface using @angular/aria/tabs directives.
keywords:
  - Tabs
  - TabList
  - Tab
  - TabPanel
  - TabContent
  - ngTabs
  - ngTabList
  - ngTab
  - ngTabPanel
  - ngTabContent
required_packages:
  - '@angular/aria/tabs'
related_concepts:
  - 'Accessibility'
  - 'A11y'
  - 'UI Patterns'
  - 'Aria'
experimental: true
---

## Purpose

The `@angular/aria/tabs` module provides a set of directives for building accessible tabbed interfaces. Tabs are a common UI pattern for organizing and navigating between different sections of content within a limited space.

## When to Use

Use the Angular Aria tabs directives when you need to present multiple sections of content in a single area, allowing users to switch between them. This is ideal for dashboards, settings panels, product details, or any scenario where content needs to be logically grouped and easily navigable without requiring a full page reload. Tabs should be avoided for sequential workflows like wizards, primary page navigation, single-section content, or scenarios requiring more than eight categories.

## Key Concepts

- **Tabs**: The main container directive for the entire tabbed interface. It orchestrates the interaction between the tab list and tab panels.
- **TabList**: A directive that applies the `tablist` ARIA role to its host element. It contains the individual `ngTab` elements.
- **Tab**: A directive that applies the `tab` ARIA role. It represents a single, selectable tab within the `ngTabList`.
- **TabPanel**: A directive that applies the `tabpanel` ARIA role. It acts as a container for the content associated with a specific `ngTab`.
- **TabContent**: A directive used within `ngTabPanel` to defer the rendering of the tab's content until the tab is activated.

## Example Files

This example demonstrates a basic tabbed interface with three tabs.

### aria-tabs-example.ts

This file defines the tabs component and manages the selected tab state.

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Tab, Tabs, TabList, TabPanel, TabContent } from '@angular/aria/tabs';

@Component({
  selector: 'tabs-example',
  templateUrl: 'tabs-example.html',
  styleUrls: ['tabs-example.css'],
  imports: [TabList, Tab, Tabs, TabPanel, TabContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsExample {}
```

### tabs-example.html

This template structures the tabs, tab list, and tab panels.

```html
<div ngTabs>
  <ul ngTabList [(selectedTab)]="selectedTab">
    <li ngTab value="tab1">Tab 1</li>
    <li ngTab value="tab2">Tab 2</li>
    <li ngTab value="tab3">Tab 3</li>
  </ul>

  <div ngTabPanel value="tab1">
    <ng-template ngTabContent>
      <h3>Content for Tab 1</h3>
      <p>This is the content for the first tab.</p>
    </ng-template>
  </div>
  <div ngTabPanel value="tab2">
    <ng-template ngTabContent>
      <h3>Content for Tab 2</h3>
      <p>This is the content for the second tab.</p>
    </ng-template>
  </div>
  <div ngTabPanel value="tab3">
    <ng-template ngTabContent>
      <h3>Content for Tab 3</h3>
      <p>This is the content for the third tab.</p>
    </ng-template>
  </div>
</div>
```

### aria-tabs-example.css

This file provides basic styling for the tabs.

```css
[ngTabList] {
  display: flex;
  justify-content: space-between;
}

[ngTab] {
  cursor: pointer;
  padding: 16px;
  display: flex;
  flex-grow: 1;
  cursor: pointer;
  align-items: center;
  border: 1px solid black;
  border-radius: 8px 8px 0 0;
}

[ngTab][aria-selected='true'] {
  border-bottom: none;
  background: #eaeaea;
}

[ngTabPanel][tabindex='0'] {
  height: 200px;
  background: #eaeaea;
  padding: 16px;
  border: 1px solid black;
  border-top: none;
}
```

## Usage Notes

- The `ngTabs` directive acts as the main container for the tabbed interface.
- The `ngTabList` contains the `ngTab` elements, and its `[(selectedTab)]` binding is used to manage the currently active tab.
- Each `ngTab` has a `value` input that corresponds to the `value` of its associated `ngTabPanel`.
- The `ngTabPanel` elements contain the content for each tab. The `ngTabContent` directive within `ngTabPanel` ensures that content is only rendered when its tab is active.
- Set the `[selectionMode]="'follow'"` on the tab list to enable selected tab following focus, where teh tab changes as you navigate.
- Change the `[orientation]="'vertical'"` on the tab list for vertical tabs.
- Use the `disabled` input on any tabs that you want disabled.
