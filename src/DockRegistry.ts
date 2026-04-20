import type { DockConfig, DockId, DockParams } from "./types";

export class DockRegistry {
  // biome-ignore lint/complexity/noUselessConstructor: defines the expected signature for implementors
  constructor(_storage: unknown, _url: string) {}

  destroy(): void {
    throw new Error("not implemented");
  }

  getDockObservable(_id: DockId): unknown {
    throw new Error("not implemented");
  }

  getMessageObservable(_id: DockId): unknown {
    throw new Error("not implemented");
  }

  register(_id: DockId, _config: DockConfig): void {
    throw new Error("not implemented");
  }

  detach(_id: DockId, _params?: DockParams): void {
    throw new Error("not implemented");
  }

  reattach(_id: DockId): void {
    throw new Error("not implemented");
  }

  focusWindow(_id: DockId): void {
    throw new Error("not implemented");
  }

  sendMessage(_id: DockId, _payload: unknown): void {
    throw new Error("not implemented");
  }

  canDetach(): boolean {
    throw new Error("not implemented");
  }
}
