export const isElectron = (): boolean => false;

export const isDesktop = (): boolean =>
  typeof window !== "undefined" &&
  typeof (globalThis as { tiny?: unknown }).tiny !== "undefined";

export const isWeb = (): boolean => !isDesktop();

export const supportsFileSystemAccess = (): boolean => isDesktop();

export const supportsAsm = (): boolean => false;

export const supportsMdv = (): boolean => false;

export const supportsRealTerminal = (): boolean => isDesktop() && tiny.system.isMacOS();

export const APPLEFM_SERVER_REQUIRED = true;
