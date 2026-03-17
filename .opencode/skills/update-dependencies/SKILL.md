---
name: update-dependencies
description: Update npm dependencies (patch, minor, and major), verify the build and tests pass, fix any breaking changes, then commit the result without pushing
license: MIT
compatibility: opencode
---

## What I do

- Run `npm outdated` to get a full picture of current, wanted, and latest versions
- Apply all patch and minor upgrades with `npm update`
- Upgrade each package with a pending major version bump using `npm install <pkg>@latest`
- Run `npm run build` and `npm test` to verify nothing is broken
- Fix any TypeScript errors or test failures caused by breaking changes
- Commit `package.json` and `package-lock.json` (do **not** push)
- Report a summary of all changes

## When to use me

- Routine dependency maintenance
- Before cutting a release
- After a security advisory (patch/minor or major scope)

## Step-by-step workflow

1. **Assess** — run `npm outdated` and capture the full report. Note which packages have a `latest` version greater than `wanted` (these are major upgrades).

2. **Patch/minor upgrades** — run `npm update`. This updates all packages within their existing semver ranges.

3. **Major upgrades** — for each package where `latest > wanted`, run:
   ```
   npm install <pkg>@latest
   ```
   Check the package's changelog or release notes for breaking changes before proceeding.

4. **Verify build** — run `npm run build`. Fix any TypeScript or bundler errors introduced by the upgrades.

5. **Verify tests** — run `npm test`. Fix any test failures introduced by the upgrades.

6. **Revert if necessary** — if a major upgrade causes too many breaking changes that cannot be reasonably resolved, revert that specific package:
   ```
   npm install <pkg>@<previous-version>
   ```
   Note the revert in the final summary.

7. **Commit** — stage and commit the updated lockfile and manifest:
   ```
   git add package.json package-lock.json
   git commit -m "chore: update dependencies"
   ```
   Do **not** run `git push`.

8. **Report** — provide a summary table:

   | Package | Old version | New version | Type |
   |---------|-------------|-------------|------|
   | example | 1.2.3       | 1.4.0       | minor |
   | example | 2.0.0       | 3.0.0       | major |

   Also list any packages that were skipped or reverted and the reason.

## Notes

- Both `package.json` and `package-lock.json` must be included in the commit.
- Do not push to the remote — leave that to the user.
- For major upgrades, always review the changelog to understand what changed before attempting to fix compilation or test errors.
