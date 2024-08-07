/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Handler function type for HTML transformation hooks.
 * It takes an object containing the HTML content to be modified.
 *
 * @param ctx - The context object containing the HTML content.
 * @returns The modified HTML content or a promise that resolves to the modified HTML content.
 */
type HtmlTransformHandler = (ctx: { html: string }) => string | Promise<string>;

/**
 * Defines the names of available hooks for registering and triggering custom logic within the application.
 */
type HookName = keyof HooksMapping;

/**
 * Mapping of hook names to their corresponding handler types.
 */
interface HooksMapping {
  'html:transform:pre': HtmlTransformHandler;
}

/**
 * Manages a collection of hooks and provides methods to register and execute them.
 * Hooks are functions that can be invoked with specific arguments to allow modifications or enhancements.
 */
export class Hooks {
  /**
   * A map of hook names to arrays of hook functions.
   * Each hook name can have multiple associated functions, which are executed in sequence.
   */
  private readonly store = new Map<HookName, Function[]>();

  /**
   * Executes all hooks associated with the specified name, passing the given argument to each hook function.
   * The hooks are invoked sequentially, and the argument may be modified by each hook.
   *
   * @template Hook - The type of the hook name. It should be one of the keys of `HooksMapping`.
   * @param name - The name of the hook whose functions will be executed.
   * @param context - The input value to be passed to each hook function. The value is mutated by each hook function.
   * @returns A promise that resolves once all hook functions have been executed.
   *
   * @example
   * ```typescript
   * const hooks = new Hooks();
   * hooks.on('html:transform:pre', async (ctx) => {
   *   ctx.html = ctx.html.replace(/foo/g, 'bar');
   *   return ctx.html;
   * });
   * const result = await hooks.run('html:transform:pre', { html: '<div>foo</div>' });
   * console.log(result); // '<div>bar</div>'
   * ```
   * @internal
   */
  async run<Hook extends keyof HooksMapping>(
    name: Hook,
    context: Parameters<HooksMapping[Hook]>[0],
  ): Promise<Awaited<ReturnType<HooksMapping[Hook]>>> {
    const hooks = this.store.get(name);
    switch (name) {
      case 'html:transform:pre': {
        if (!hooks) {
          return context.html as Awaited<ReturnType<HooksMapping[Hook]>>;
        }

        const ctx = { ...context };
        for (const hook of hooks) {
          ctx.html = await hook(ctx);
        }

        return ctx.html as Awaited<ReturnType<HooksMapping[Hook]>>;
      }
      default:
        throw new Error(`Running hook "${name}" is not supported.`);
    }
  }

  /**
   * Registers a new hook function under the specified hook name.
   * This function should be a function that takes an argument of type `T` and returns a `string` or `Promise<string>`.
   *
   * @template Hook - The type of the hook name. It should be one of the keys of `HooksMapping`.
   * @param name - The name of the hook under which the function will be registered.
   * @param handler - A function to be executed when the hook is triggered. The handler will be called with an argument
   *                  that may be modified by the hook functions.
   *
   * @remarks
   * - If there are existing handlers registered under the given hook name, the new handler will be added to the list.
   * - If no handlers are registered under the given hook name, a new list will be created with the handler as its first element.
   *
   * @example
   * ```typescript
   * hooks.on('html:transform:pre', async (ctx) => {
   *   return ctx.html.replace(/foo/g, 'bar');
   * });
   * ```
   */
  on<Hook extends HookName>(name: Hook, handler: HooksMapping[Hook]): void {
    const hooks = this.store.get(name);
    if (hooks) {
      hooks.push(handler);
    } else {
      this.store.set(name, [handler]);
    }
  }

  /**
   * Checks if there are any hooks registered under the specified name.
   *
   * @param name - The name of the hook to check.
   * @returns `true` if there are hooks registered under the specified name, otherwise `false`.
   */
  has(name: HookName): boolean {
    return !!this.store.get(name)?.length;
  }
}
