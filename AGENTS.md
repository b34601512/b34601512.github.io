# SoftTalk 官网 · Repository Rules

- Local repository: `D:\SoftTalk官网`
- GitHub: <https://github.com/b34601512/b34601512.github.io>
- Work and acceptance criteria: repository GitHub Issues.

## Boundaries

- The site is a static GitHub Pages project. Generated HTML and `sitemap.xml` come from `scripts/build-site.mjs`; do not hand-edit generated output as a second source.
- Public claims, interaction behavior, prices, and feature names must be checked against the current SoftTalk client source before publication.
- Keep the site minimal: each fact appears on its owning page; do not reintroduce removed FAQ, screenshot, feature-card, or blog sections without an explicit issue.
- Credentials, analytics secrets, real customer data, and private screenshots do not enter the repository.

## Verification and release

```powershell
node scripts/build-site.mjs
node scripts/check-site.mjs
```

Run focused browser checks for changed interactions, then commit and push `main` so GitHub Pages republishes. A build is complete only when generated files are clean on a second build and the issue's real page behavior is verified.

## Context index

`CLAUDE.md` is a short index. Detailed rules are split under `docs/ai-context/`; read only the topic needed for the current change.
