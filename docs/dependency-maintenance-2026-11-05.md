# Dependency maintenance — November 5, 2026

A GitHub Dependabot email flagged Axios. The installed lockfile held Axios 1.7.9; GitHub's open Axios advisories included fixes through 1.20.0. Updated the direct dependency and lockfile to Axios 1.21.0.

Applied compatible dependency updates without forced major-version upgrades. This includes Vite 6.0.7 → 6.4.5 and a Sucrase patch that removes its outdated Glob dependency. Updated remaining compatible parser/globbing dependencies through npm resolution rather than broad overrides.

Validation after updates:

- `npm audit`: zero reported vulnerabilities, including development dependencies.
- `npm audit --omit=dev`: zero reported production vulnerabilities.
- ESLint, all 12 regression tests and production build pass.
- NASA handler is smoke-tested against the live upstream feed after the Axios update.

These audit results reflect the advisory database at the time of the check; future advisories can change them. GitHub resolves alerts from the updated lockfile after it processes the pushed commit.
