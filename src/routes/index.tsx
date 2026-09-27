import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Github, Sparkles, Loader2, Star, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ScoreBar";
import { screenApplicant, CRITERIA } from "@/lib/screen.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Intern Screener — AI scoring for GitHub applicants" },
      {
        name: "description",
        content:
          "Paste a GitHub username and get an AI-scored breakdown of an intern applicant across six AI, automation and security criteria.",
      },
      { property: "og:title", content: "Intern Screener — AI scoring for GitHub applicants" },
      {
        property: "og:description",
        content:
          "Paste a GitHub username and get an AI-scored breakdown of an intern applicant across six AI, automation and security criteria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EXAMPLE = {
  username: "karpathy",
  links: "https://x.com/karpathy\nhttps://karpathy.ai",
};

function Index() {
  const [username, setUsername] = useState("");
  const [links, setLinks] = useState("");
  const run = useServerFn(screenApplicant);

  const mutation = useMutation({
    mutationFn: (vars: { username: string; links: string }) => run({ data: vars }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    mutation.mutate({ username, links });
  }

  function loadExample() {
    setUsername(EXAMPLE.username);
    setLinks(EXAMPLE.links);
    mutation.mutate(EXAMPLE);
  }

  const result = mutation.data;

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
        <header className="text-center">
          <Badge variant="secondary" className="mb-5 font-mono text-xs uppercase tracking-widest">
            candidate signal
          </Badge>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Intern Screener</h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
            Drop a GitHub username. We read their public work and score it across six
            skill areas that actually matter for an AI internship.
          </p>
        </header>

        <form onSubmit={submit} className="panel mt-10 space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Github className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="github username"
                className="h-11 pl-9 font-mono"
                autoComplete="off"
              />
            </div>
            <Button type="submit" size="lg" disabled={mutation.isPending} className="h-11">
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Screen
            </Button>
          </div>
          <Textarea
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            placeholder="Optional: portfolio, X, LinkedIn, YouTube links (one per line)"
            rows={2}
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Public GitHub data only.</p>
            <Button type="button" variant="ghost" size="sm" onClick={loadExample} disabled={mutation.isPending}>
              Example
            </Button>
          </div>
        </form>

        {mutation.isError ? (
          <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            {(mutation.error as Error).message}
          </p>
        ) : null}

        {mutation.isPending ? (
          <p className="mt-10 text-center font-mono text-sm text-muted-foreground">
            Reading repositories and scoring… this can take a couple of minutes.
          </p>
        ) : null}

        {result ? (
          <section className="mt-10 space-y-6">
            <div className="panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              <img
                src={result.profile.avatar}
                alt={result.profile.login}
                className="size-20 rounded-2xl border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold">{result.profile.name ?? result.profile.login}</h2>
                <a
                  href={result.profile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
                >
                  @{result.profile.login}
                  <ExternalLink className="size-3" />
                </a>
                {result.profile.bio ? (
                  <p className="mt-2 text-sm text-muted-foreground">{result.profile.bio}</p>
                ) : null}
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {result.profile.publicRepos} repos · {result.profile.followers} followers
                  {result.profile.location ? ` · ${result.profile.location}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-center">
                <div className="font-mono text-5xl font-semibold text-accent">
                  {result.screening.overall.toFixed(1)}
                </div>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  overall
                </div>
              </div>
            </div>

            <div className="panel space-y-5 p-6">
              {CRITERIA.map(({ key, label }) => {
                const entry = result.screening.scores[key];
                return (
                  <ScoreBar key={key} label={label} score={entry?.score ?? 0} note={entry?.note} />
                );
              })}
            </div>

            <div className="panel space-y-3 p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                summary
              </h3>
              {result.screening.summary.slice(0, 3).map((line, i) => (
                <p key={i} className="text-sm leading-relaxed">
                  {line}
                </p>
              ))}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="panel space-y-3 p-6">
                <h3 className="font-mono text-xs uppercase tracking-widest text-accent">
                  strongest signal
                </h3>
                <p className="text-sm leading-relaxed">{result.screening.strongestSignal}</p>
              </div>
              <div className="panel space-y-3 p-6">
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  missing
                </h3>
                <ul className="space-y-2">
                  {result.screening.missing.map((m, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed">
                      <span className="text-muted-foreground">—</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="panel p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                top repositories
              </h3>
              <ul className="mt-4 space-y-3">
                {result.repos.slice(0, 8).map((repo) => (
                  <li key={repo.name} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm">{repo.name}</p>
                      {repo.description ? (
                        <p className="truncate text-xs text-muted-foreground">{repo.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground">
                      {repo.language ? <span>{repo.language}</span> : null}
                      <span className="flex items-center gap-1">
                        <Star className="size-3" />
                        {repo.stars}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
