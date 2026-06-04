import { describe, it, expect } from "vitest";
import { IS_TAURI, configApi, watchApi } from "./tauri";

// In jsdom there is no __TAURI_INTERNALS__, so the bridge runs in "browser
// mock" mode and must degrade gracefully rather than throw.
describe("tauri bridge (browser mode)", () => {
  it("detects that Tauri is unavailable", () => {
    expect(IS_TAURI).toBe(false);
  });

  it("configApi.load resolves to an empty config", async () => {
    await expect(configApi.load()).resolves.toEqual({});
  });

  it("watchApi calls are no-ops that resolve", async () => {
    await expect(watchApi.watch("/tmp/x")).resolves.toBeUndefined();
    const un = await watchApi.onChange(() => {});
    expect(typeof un).toBe("function");
    un();
  });
});
