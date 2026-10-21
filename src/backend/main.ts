export const api: Record<string, TinyApiHandler> = {
  appInfo: async () => ({
    name: "Right-Stuff Editor Desktop",
    version: "0.1.0",
  }),

  notesHealth: async (_params, app) => {
    const permission = await app.permissions.check("automation:com.apple.Notes");
    let accounts: string[] | null = null;
    let error: string | null = null;
    try {
      const raw = await app.macos.applescript(
        'tell application "Notes" to get name of every account',
      );
      accounts = raw ? raw.split(", ") : [];
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    return { permission, accounts, error };
  },
};

export function init(app: TinyApp) {
  app.setTitle("Right-Stuff Editor Desktop");
}
