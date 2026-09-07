import { installCoreDomainRuntimePorts } from "./coreDomainRuntimePorts.js";
import { installApiKeyRotatorDbRuntimeHooks } from "./apiKeyRotator.js";
import { installModelDeprecationDbRuntimeHooks } from "./modelDeprecation.js";
import { installProxyFallbackDbRuntimeHooks } from "../utils/proxyFallback.js";
import { installUltraCompressionDbRuntimeHooks } from "./compression/ultra.js";
import { installNativeCodexTurnPinDbRuntimeHooks } from "./combo/nativeCodexTurnPin.js";

let runtimePortsInstalled = false;

export function installRuntimePorts(): void {
  if (runtimePortsInstalled) return;
  installCoreDomainRuntimePorts();
  installApiKeyRotatorDbRuntimeHooks();
  installModelDeprecationDbRuntimeHooks();
  installProxyFallbackDbRuntimeHooks();
  installUltraCompressionDbRuntimeHooks();
  installNativeCodexTurnPinDbRuntimeHooks();
  runtimePortsInstalled = true;
}
