declare module "tjs:sqlite" {
  export interface SqliteStatement {
    run(...params: unknown[]): void;
    all(...params: unknown[]): unknown[];
    finalize(): void;
  }

  export class Database {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): SqliteStatement;
    close(): void;
  }
}
