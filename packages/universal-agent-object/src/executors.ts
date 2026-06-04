/**
 * ============================================================
 * PLATFORM EXECUTOR ADAPTERS
 * ============================================================
 * Thin adapter stubs for each target platform.
 *
 * The universal agent object is platform-agnostic.
 * These adapters are the "last mile" that perform the
 * actual automation using the correct OS-level API.
 *
 * Each adapter implements PlatformExecutor.
 * Concrete implementations are in their own runtime packages.
 * ============================================================
 */

import {
  UniversalWorkflowStep,
  ExecutionContext,
  WorkflowStepAction,
} from "./types";
import { PlatformExecutor } from "./runtime-agent";
import { ExecutionContextBuilder } from "./execution-context";

// ─────────────────────────────────────────────
// Base Executor (shared logic)
// ─────────────────────────────────────────────
abstract class BaseExecutor implements PlatformExecutor {
  abstract platform: string;

  /** Subclasses implement the actual dispatch */
  abstract execute(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown>;

  /** Resolve input values before execution */
  protected resolveInput(step: UniversalWorkflowStep, ctx: ExecutionContext): unknown {
    return ExecutionContextBuilder.resolve(step.input, ctx);
  }

  /** Resolve selector value */
  protected resolveSelector(step: UniversalWorkflowStep, ctx: ExecutionContext): string {
    if (!step.target) return "";
    return ExecutionContextBuilder.resolve(step.target.value, ctx) as string;
  }
}

// ─────────────────────────────────────────────
// 1. WEB EXECUTOR (Playwright-backed)
// ─────────────────────────────────────────────
/**
 * Concrete adapter that drives a Playwright Page.
 * Works on: Windows / macOS / Linux / Docker / Kubernetes
 * (any env with a Chrome/Firefox/WebKit binary)
 */
export class WebExecutor extends BaseExecutor {
  platform = "web";

  /**
   * @param page - A Playwright `Page` object (injected from outside)
   * The package itself does not import Playwright to avoid forcing
   * the dependency on every runtime. Inject the page externally.
   */
  constructor(private page: any) {
    super();
  }

  async execute(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown> {
    const selector = this.resolveSelector(step, context);
    const input = this.resolveInput(step, context);

    switch (step.action as WorkflowStepAction) {
      case "navigate":
        return this.page.goto(input as string);

      case "click":
        return this.page.click(selector);

      case "double-click":
        return this.page.dblclick(selector);

      case "type":
        return this.page.fill(selector, input as string);

      case "clear":
        return this.page.fill(selector, "");

      case "select":
        return this.page.selectOption(selector, input as string);

      case "check":
        return this.page.check(selector);

      case "uncheck":
        return this.page.uncheck(selector);

      case "hover":
        return this.page.hover(selector);

      case "scroll":
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        return this.page.evaluate(
          new Function("sel", "document.querySelector(sel)?.scrollIntoView()"),
          selector
        );

      case "screenshot":
        return this.page.screenshot({ path: String(input ?? "screenshot.png") });

      case "wait-for-element":
        return this.page.waitForSelector(selector, {
          timeout: step.timeout,
        });

      case "wait-for-navigation":
        return this.page.waitForNavigation({ timeout: step.timeout });

      case "wait-for-network-idle":
        return this.page.waitForLoadState("networkidle", { timeout: step.timeout });

      case "set-variable":
        // No DOM interaction — variable is set by the engine
        return null;

      case "log":
        console.log(`[Web][Step ${step.sequence}]`, input);
        return null;

      default:
        throw new Error(`WebExecutor: unsupported action "${step.action}"`);
    }
  }
}

// ─────────────────────────────────────────────
// 2. WINDOWS EXECUTOR (UIA / Win32 via stub)
// ─────────────────────────────────────────────
/**
 * Delegates to the .NET desktop agent via a local HTTP bridge.
 * The .NET agent (UIA + Win32) listens on localhost:7070.
 *
 * Windows only — safely no-ops on other platforms.
 */
export class WindowsExecutor extends BaseExecutor {
  platform = "windows";

  constructor(
    private bridgeUrl: string = "http://localhost:7070/api/uia"
  ) {
    super();
  }

  async execute(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown> {
    if (process.platform !== "win32") {
      throw new Error("WindowsExecutor can only run on Windows");
    }

    const payload = {
      action: step.action,
      selector: {
        type: step.target?.type ?? "uia-automation-id",
        value: this.resolveSelector(step, context),
      },
      input: this.resolveInput(step, context),
    };

    const res = await fetch(this.bridgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`WindowsExecutor bridge error ${res.status}: ${body}`);
    }

    return res.json();
  }
}

// ─────────────────────────────────────────────
// 3. macOS EXECUTOR (AXUIElement via bridge)
// ─────────────────────────────────────────────
/**
 * Delegates to a Swift/ObjC helper that wraps AXUIElement.
 * The helper listens on localhost:7071.
 */
export class MacOSExecutor extends BaseExecutor {
  platform = "macos";

  constructor(private bridgeUrl: string = "http://localhost:7071/api/ax") {
    super();
  }

  async execute(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown> {
    if (process.platform !== "darwin") {
      throw new Error("MacOSExecutor can only run on macOS");
    }

    const payload = {
      action: step.action,
      selector: {
        type: step.target?.type ?? "ax-role",
        value: this.resolveSelector(step, context),
      },
      input: this.resolveInput(step, context),
    };

    const res = await fetch(this.bridgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`MacOSExecutor bridge error ${res.status}`);
    }

    return res.json();
  }
}

// ─────────────────────────────────────────────
// 4. LINUX EXECUTOR (AT-SPI via bridge)
// ─────────────────────────────────────────────
/**
 * Delegates to a Python helper using pyatspi2.
 * Listens on localhost:7072.
 */
export class LinuxExecutor extends BaseExecutor {
  platform = "linux";

  constructor(private bridgeUrl: string = "http://localhost:7072/api/atspi") {
    super();
  }

  async execute(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown> {
    const payload = {
      action: step.action,
      selector: {
        type: step.target?.type ?? "at-spi",
        value: this.resolveSelector(step, context),
      },
      input: this.resolveInput(step, context),
    };

    const res = await fetch(this.bridgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`LinuxExecutor bridge error ${res.status}`);
    }

    return res.json();
  }
}

// ─────────────────────────────────────────────
// 5. TERMINAL EXECUTOR (PTY / SSH / IBM)
// ─────────────────────────────────────────────
/**
 * Executes shell commands in a PTY session.
 * Works on: Linux / macOS (native PTY)
 * On Windows: uses ConPTY via a local bridge.
 */
export class TerminalExecutor extends BaseExecutor {
  platform = "terminal";

  /** Inject a function that executes a command and returns stdout */
  constructor(
    private execFn: (command: string) => Promise<string>
  ) {
    super();
  }

  async execute(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown> {
    const command = this.resolveInput(step, context) as string;

    switch (step.action as WorkflowStepAction) {
      case "execute-command":
        return this.execFn(command);

      case "send-keystrokes":
        // For IBM terminals / pseudo-TTY keystroke injection
        return this.execFn(`printf '${command}'`);

      case "log":
        console.log(`[Terminal][Step ${step.sequence}]`, command);
        return null;

      default:
        throw new Error(`TerminalExecutor: unsupported action "${step.action}"`);
    }
  }
}

// ─────────────────────────────────────────────
// 6. API EXECUTOR (HTTP / gRPC)
// ─────────────────────────────────────────────
export class ApiExecutor extends BaseExecutor {
  platform = "api";

  async execute(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown> {
    const input = this.resolveInput(step, context) as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    };

    const res = await fetch(input.url, {
      method: input.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(input.headers ?? {}),
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
    });

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

// ─────────────────────────────────────────────
// 7. FILE EXECUTOR (read / write / move)
// ─────────────────────────────────────────────
export class FileExecutor extends BaseExecutor {
  platform = "file";

  async execute(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown> {
    const fs = require("fs").promises as typeof import("fs/promises");
    const input = this.resolveInput(step, context) as {
      path: string;
      content?: string;
      encoding?: BufferEncoding;
    };

    switch (step.action as WorkflowStepAction) {
      case "read-file":
        return fs.readFile(input.path, { encoding: input.encoding ?? "utf8" });

      case "write-file":
        await fs.writeFile(input.path, input.content ?? "", {
          encoding: input.encoding ?? "utf8",
        });
        return null;

      default:
        throw new Error(`FileExecutor: unsupported action "${step.action}"`);
    }
  }
}

// ─────────────────────────────────────────────
// Executor Registry (convenience)
// ─────────────────────────────────────────────
export function createDefaultExecutors(options: {
  playwrightPage?: any;
  windowsBridgeUrl?: string;
  macosBridgeUrl?: string;
  linuxBridgeUrl?: string;
  execFn?: (cmd: string) => Promise<string>;
}): PlatformExecutor[] {
  const executors: PlatformExecutor[] = [
    new ApiExecutor(),
    new FileExecutor(),
  ];

  if (options.playwrightPage) {
    executors.push(new WebExecutor(options.playwrightPage));
  }

  if (process.platform === "win32") {
    executors.push(new WindowsExecutor(options.windowsBridgeUrl));
  } else if (process.platform === "darwin") {
    executors.push(new MacOSExecutor(options.macosBridgeUrl));
  } else {
    executors.push(new LinuxExecutor(options.linuxBridgeUrl));
  }

  if (options.execFn) {
    executors.push(new TerminalExecutor(options.execFn));
  }

  return executors;
}
