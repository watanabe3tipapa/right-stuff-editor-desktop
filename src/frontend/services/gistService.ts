import type { CreateGistParams, UpdateGistParams } from "@/types";

const GITHUB_API = "https://api.github.com";

class GistService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${GITHUB_API}${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `GitHub API error: ${res.status}`);
    }
    return res.json();
  }

  async verifyToken(token: string) {
    this.setToken(token);
    return this.fetch("/user");
  }

  async createGist(params: CreateGistParams) {
    return this.fetch("/gists", {
      method: "POST",
      body: JSON.stringify({
        description: params.description,
        public: params.isPublic,
        files: {
          [params.filename]: {
            content: params.content,
          },
        },
      }),
    });
  }

  async updateGist(gistId: string, params: UpdateGistParams) {
    return this.fetch(`/gists/${gistId}`, {
      method: "PATCH",
      body: JSON.stringify({
        description: params.description,
        files: {
          [params.filename]: {
            content: params.content,
          },
        },
      }),
    });
  }

  async listGists(page = 1, perPage = 30) {
    return this.fetch(`/gists?per_page=${perPage}&page=${page}`);
  }

  async getGist(gistId: string) {
    return this.fetch(`/gists/${gistId}`);
  }
}

export const gistService = new GistService();
