import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  updated: string;
  topics: string[];
};

export type Profile = {
  login: string;
  name: string | null;
  bio: string | null;
  avatar: string;
  followers: number;
  publicRepos: number;
  location: string | null;
  blog: string | null;
  url: string;
};

export type ScoreKey =
  | "openSourceAi"
  | "aiContent"
  | "automation"
  | "socialStrategy"
  | "aiCoding"
  | "cybersecurity";

export type Screening = {
  scores: Record<ScoreKey, { score: number; note: string }>;
  overall: number;
  summary: string[];
  strongestSignal: string;
  missing: string[];
};

export const CRITERIA: { key: ScoreKey; label: string }[] = [
  { key: "openSourceAi", label: "Open-source AI & models (LoRAs, fine-tuning)" },
  { key: "aiContent", label: "AI content creation (audio / video)" },
  { key: "automation", label: "Automation & architecture (APIs, MCP, workflows)" },
  { key: "socialStrategy", label: "Social media & content strategy" },
  { key: "aiCoding", label: "AI-assisted coding & deployment" },
  { key: "cybersecurity", label: "Cybersecurity" },
];

const criterionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "number", description: "0 to 10" },
    note: { type: "string", description: "One short sentence of evidence." },
  },
  required: ["score", "note"],
};

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    scores: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(CRITERIA.map((c) => [c.key, criterionSchema])),
      required: CRITERIA.map((c) => c.key),
    },
    overall: { type: "number", description: "0 to 10 overall fit" },
    summary: {
      type: "array",
      description: "Exactly 3 short lines about the applicant.",
      items: { type: "string" },
    },
    strongestSignal: { type: "string" },
    missing: { type: "array", items: { type: "string" } },
  },
  required: ["scores", "overall", "summary", "strongestSignal", "missing"],
};

async function gh(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "intern-screener" },
  });
  if (res.status === 404) throw new Error("That GitHub username doesn't exist.");
  if (res.status === 403) throw new Error("GitHub is rate limiting us right now. Try again in a few minutes.");
  if (!res.ok) throw new Error("Couldn't reach GitHub just now.");
  return res.json();
}

export const screenApplicant = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        username: z.string().trim().min(1).max(39),
        links: z.string().trim().max(2000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const username = data.username.replace(/^@/, "").replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "");

    const [rawUser, rawRepos] = await Promise.all([
      gh(`/users/${encodeURIComponent(username)}`),
      gh(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`),
    ]);

    const profile: Profile = {
      login: rawUser.login,
      name: rawUser.name ?? null,
      bio: rawUser.bio ?? null,
      avatar: rawUser.avatar_url,
      followers: rawUser.followers ?? 0,
      publicRepos: rawUser.public_repos ?? 0,
      location: rawUser.location ?? null,
      blog: rawUser.blog || null,
      url: rawUser.html_url,
    };

    const repos: Repo[] = (rawRepos as any[])
      .filter((r) => !r.fork)
      .map((r) => ({
        name: r.name,
        description: r.description ?? null,
        language: r.language ?? null,
        stars: r.stargazers_count ?? 0,
        updated: r.updated_at,
        topics: r.topics ?? [],
      }))
      .sort((a, b) => b.stars - a.stars || b.updated.localeCompare(a.updated))
      .slice(0, 40);

    const links = parseLinks(data.links);

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this app yet.");

    const prompt = [
      "You are screening a candidate for an AI-focused internship. Score strictly from evidence; absence of evidence means a low score. Scores are 0-10 and may use one decimal.",
      "Evidence comes from TWO equal sources: their public GitHub data AND the links they provided (each with the applicant's own description). Links count as real evidence even if the applicant has zero GitHub repositories — never score 0 across the board just because GitHub is empty.",
      "",
      "How to use links:",
      "- Instagram, YouTube, TikTok (and similar social/video platforms): evidence for 'Social media & content strategy' and 'AI content creation'.",
      "- Demo videos (e.g. YouTube/Loom/Vimeo showing a tool or workflow, or described as a demo): evidence for 'Automation & architecture' and 'AI content creation'.",
      "- Portfolio / personal sites / deployed apps: evidence for 'AI-assisted coding & deployment'.",
      "- Use the applicant's description text next to each link to understand what it shows. You cannot open links; judge from the URL and description.",
      "",
      `Profile: ${JSON.stringify(profile)}`,
      `Repositories (${repos.length}): ${JSON.stringify(repos)}`,
      links.length
        ? `Applicant links (${links.length}): ${JSON.stringify(links)}`
        : "No extra links provided.",
      "",
      "Criteria: " + CRITERIA.map((c, i) => `${i + 1}) ${c.label}`).join("; "),
      "",
      "In each criterion note, cite the specific repo or link that justified the score. Write the summary as exactly 3 short lines (max 18 words each). 'strongestSignal' names the single most convincing piece of evidence (repo or link). 'missing' lists 2-4 concrete gaps.",
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "user", content: prompt }],
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: {
          format: {
            type: "json_schema",
            name: "screening",
            strict: true,
            schema: jsonSchema,
          },
        },
      }),
    });

    if (res.status === 429) throw new Error("The AI is busy right now — try again in a moment.");
    if (res.status === 402) throw new Error("This app is out of AI credits.");
    if (!res.ok || !res.body) {
      throw new Error("The AI review failed. Please try again.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          }
        } catch {
          /* ignore partial */
        }
      }
    }

    let screening: Screening;
    try {
      screening = JSON.parse(text);
    } catch {
      throw new Error("The AI returned an unreadable review. Please try again.");
    }

    return { profile, repos, links, screening };
  });

export type ApplicantLink = { url: string; kind: string; description: string };

function classify(url: string): string {
  const u = url.toLowerCase();
  if (/instagram\.com/.test(u)) return "Instagram";
  if (/tiktok\.com/.test(u)) return "TikTok";
  if (/youtube\.com|youtu\.be/.test(u)) return "YouTube";
  if (/loom\.com|vimeo\.com/.test(u)) return "Demo video";
  if (/(x|twitter)\.com/.test(u)) return "X / Twitter";
  if (/linkedin\.com/.test(u)) return "LinkedIn";
  if (/github\.com/.test(u)) return "GitHub";
  if (/huggingface\.co/.test(u)) return "Hugging Face";
  return "Portfolio / site";
}

function parseLinks(raw: string): ApplicantLink[] {
  const out: ApplicantLink[] = [];
  const urlRe = /(https?:\/\/[^\s,]+|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s,]*)?)/gi;
  for (const line of raw.split(/\n+/)) {
    const matches = line.match(urlRe) ?? [];
    const description = line.replace(urlRe, "").replace(/^[\s\-–—:|•*]+|[\s\-–—:|]+$/g, "").trim();
    for (const m of matches) {
      const url = /^https?:\/\//i.test(m) ? m : `https://${m}`;
      let kind = classify(url);
      if (/demo|walkthrough|showcase/i.test(description) && /YouTube|TikTok|Instagram|X \/ Twitter|LinkedIn/.test(kind)) {
        kind = `${kind} (demo video)`;
      }
      out.push({ url, kind, description });
    }
  }
  return out.slice(0, 30);
}
