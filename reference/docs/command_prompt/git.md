Here’s a list of common Git uses in a code project, from daily basics to team collaboration:

### 1. Tracking changes (commit history)
- `git add <file>` + `git commit -m "message"` – save snapshots of your code.
- `git status` – see what’s modified, staged, or untracked.
- `git log` – review commit history.

### 2. Branching for features & fixes
- `git checkout -b experience_claude.md_system_1` – create a new branch and awitch.

- `git branch <name>` – create a new branch.
- `git checkout <branch>` or `git switch <branch>` – move between branches.
- `git merge <branch>` – integrate changes from another branch.
- Keep `main`/`master` stable; develop features in isolation.

### 3. Collaborating with remotes (GitHub, GitLab, etc.)
- `git clone <url>` – copy a remote repo locally.
- `git pull` – fetch + merge remote changes.
- `git push` – upload local commits to remote.
- `git fetch` – see remote updates without merging.

### 4. Undoing & correcting mistakes
- `git reset` – unstage files or move branch pointer (soft/hard).
- `git revert <commit>` – create a new commit that undoes a previous one (safe for shared history).
- `git checkout -- <file>` – discard local changes in a file.
- `git commit --amend` – modify the last commit (message or content).

### 5. Code reviews & pull requests (PRs)
- Push a feature branch → open PR on remote → review → merge.
- `git diff` – see changes before staging or between branches.

### 6. Stashing temporary work
- `git stash` – save uncommitted changes aside.
- `git stash pop` – reapply and remove from stash.
- Useful when you need to switch branches quickly without committing half‑done work.

### 7. Tagging releases
- `git tag v1.0.0` – mark a specific commit as a release.
- `git push --tags` – share tags with remote.

### 8. Resolving merge conflicts
- Git marks conflicted files → edit manually → `git add` → `git commit`.

### 9. Keeping history clean
- `git rebase <branch>` – rewrite commits to linearize history (avoid “merge bubbles”).
- `git rebase -i HEAD~n` – squash, reorder, or edit commits interactively.

### 10. Ignoring files (`.gitignore`)
- List build artifacts, secrets, IDE files, etc. to keep the repo clean.

These cover most day‑to‑day Git operations in a team or solo project.