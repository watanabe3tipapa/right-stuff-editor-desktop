import { describe, expect, it } from "vitest";
import { filterSlashCommands, SLASH_COMMANDS } from "./slashCommands";

describe("slash command filtering", () => {
  it("returns every command for an empty query", () => {
    expect(filterSlashCommands(SLASH_COMMANDS, "")).toHaveLength(SLASH_COMMANDS.length);
  });

  it("ranks an exact label prefix first", () => {
    expect(filterSlashCommands(SLASH_COMMANDS, "h2")[0].id).toBe("h2");
    expect(filterSlashCommands(SLASH_COMMANDS, "表")[0].id).toBe("table");
  });

  it("matches keywords and keeps table order for ties", () => {
    const listCommands = filterSlashCommands(SLASH_COMMANDS, "list").map((item) => item.id);
    expect(listCommands.slice(0, 2)).toEqual(["bullet", "numbered"]);
  });

  it("finds commands by their Japanese label", () => {
    const headings = filterSlashCommands(SLASH_COMMANDS, "見出し").map((item) => item.id);
    expect(headings).toEqual(["h1", "h2", "h3", "h4", "h5", "h6"]);
  });

  it("returns nothing for an unknown query", () => {
    expect(filterSlashCommands(SLASH_COMMANDS, "zzz")).toEqual([]);
  });
});
