/**
 * Frida runtime global declarations.
 *
 * frida-compile bundles @types/frida-gum automatically, but having
 * explicit ambient declarations ensures type-checking works even
 * when the gum typings are not resolved by the IDE.
 */

// ── Frida-Gum core globals (supplementary) ──────────────────────
// frida-compile injects these at bundle time. Declaring them here
// keeps the language server happy during development.

declare function send(message: any, data?: ArrayBuffer | null): void;
declare function recv(callback: (message: any) => void): MessageRecvCallback;

interface MessageRecvCallback {
  wait(): void;
}

declare function hexdump(
  target: NativePointerValue,
  options?: { offset?: number; length?: number; header?: boolean; ansi?: boolean },
): string;