/**
 * ============================================================
 * @nextgen/universal-agent-object — Public API
 * ============================================================
 * Single import point for all consumers:
 *
 *   import { UniversalAgentFactory, RuntimeAgent, ... }
 *     from "@nextgen/universal-agent-object";
 * ============================================================
 */

// Core types & schemas
export * from "./types";

// Platform detection
export {
  detectOS,
  detectArch,
  detectCapabilities,
  detectContainerRuntime,
  isInsideDocker,
  isInsideKubernetes,
  buildRuntimeEnvironment,
} from "./platform-detector";

// Factory & serialisation
export { UniversalAgentFactory } from "./factory";
export type { AgentFactoryConfig } from "./factory";

// Runtime agent
export { RuntimeAgent } from "./runtime-agent";
export type { RuntimeAgentEvents, PlatformExecutor } from "./runtime-agent";

// Execution context
export { ExecutionContextBuilder } from "./execution-context";

// Platform executors
export {
  WebExecutor,
  WindowsExecutor,
  MacOSExecutor,
  LinuxExecutor,
  TerminalExecutor,
  ApiExecutor,
  FileExecutor,
  createDefaultExecutors,
} from "./executors";
