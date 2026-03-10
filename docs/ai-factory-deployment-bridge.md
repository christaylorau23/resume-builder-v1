# AI Factory Deployment Bridge: SSH and Repository Safety

The deployment phase is the final step of the execution loop:

**Idea → BMAD PRD → BMAD Architecture → BMAD Stories → Bridge → Ralph run → Verify → Commit**

Ralph and Claude operate autonomously in the terminal and rely entirely on **key-based SSH authentication** to interact with GitHub. If your Git environment expects interactive passwords, web-browser OAuth, or is affected by Windows-to-Linux line endings, the pipeline can hang or crash and require manual intervention. Engineering the environment securely upfront allows agents to push verified code seamlessly.

Execute the following steps in exact sequence.

---

## Phase 1: Cryptographic Foundation (SSH Key Generation)

Generate a modern, high-performance SSH key for this WSL environment using the ed25519 algorithm.

1. Open your WSL terminal and run:

   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. When prompted for a file to save the key in, press **Enter** to accept the default (`~/.ssh/id_ed25519`).
3. When prompted for a passphrase, press **Enter** twice to leave it **empty**. An empty passphrase is required so an AI agent can push without waiting for human input.

---

## Phase 2: SSH Agent Activation & Key Extraction

Load the key into the SSH agent and get the public key for GitHub.

1. Start the agent:

   ```bash
   eval "$(ssh-agent -s)"
   ```

2. Load the key:

   ```bash
   ssh-add ~/.ssh/id_ed25519
   ```

3. Print the public key:

   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

4. Copy the entire output. Then in a browser, go to **GitHub → Settings → SSH and GPG keys**, click **New SSH key**, and paste the key. Authorization of the key is manual and cannot be automated from the terminal.

---

## Phase 3: Repository Context Engineering

Before pushing code, protect the repository from cross-OS line-ending issues and secret leaks.

- **Line endings:** The repo root contains a `.gitattributes` file that enforces LF. This prevents CRLF from Windows from breaking Bash scripts (e.g. `scripts/verify.sh`) when run in WSL. Commit it once and leave it in place.
- **Secrets:** A global `.gitignore` excludes `.env`, `.env.*`, and similar files from being committed. `.claudeignore` (and optionally `.cursorignore`) keeps those paths out of agent context so tools do not read or accidentally use API keys or local vault data.

If your Obsidian or other knowledge vault lives inside this repo, add its path to `.gitignore` and to `.claudeignore`/`.cursorignore`. If the vault is outside the repo, do not give agents that path.

---

## Phase 4: GPG Signature Routing (Mobile Stability)

If Git is configured to sign commits with a GPG key, WSL can route the password prompt to the wrong TTY and cause the pipeline to hang. Fix it so the prompt appears in the current terminal (and works when using Mosh/tmux from a phone):

```bash
echo 'export GPG_TTY=$(tty)' >> ~/.zshrc
source ~/.zshrc
```

---

## Phase 5: Push and Factory Execution

When you create a new project with `factory new <project-name>`, the Git repository is initialized automatically. After adding the GitHub remote, agents can run `git push` autonomously once the verification gates pass.

---

## Branching and agent safety

To prevent a hallucinating or buggy agent from deploying destructive code to the production branch while unattended:

- **Default branch (e.g. `main` or `master`) is the production line.** Only this branch is used for deployment or as the source of truth for production.
- **Agents push only to non-default branches.** After `scripts/verify.sh` passes, agents commit and push to a feature or agent branch (e.g. `feature/<task>` or `agent/<short-id>`). They must never push directly to the default branch.
- **Merges to the default branch happen via pull request and human review.** Optionally, require the CI workflow (e.g. `.github/workflows/verify.yml`) to pass before a PR can be merged.
- **Protect the default branch on GitHub:** In the repo **Settings → Branches**, add a branch protection rule for `main` (or your default): require a pull request before merging, require status checks if you use CI, and disallow force-push and deletion. That way, even if an agent attempts `git push origin main`, GitHub rejects it.

---

## Critical Path and Bottlenecks

| Item | Why it matters |
|------|----------------|
| **Passwordless key** | A passphrase on the SSH key forces interactive input; Ralph will hang when trying to push. |
| **Line-ending safety** | Without `.gitattributes`, CRLF can break `scripts/verify.sh` and other gates. |
| **Secret isolation** | Without `.claudeignore`/`.cursorignore`, agents may read `.env` and similar files and risk leaking keys. |
| **GPG_TTY** | Without it, GPG-signed commits can hang when the prompt is sent to a different TTY (e.g. mobile). |

**Manual prerequisite:** You must add the public key in GitHub (Settings → SSH and GPG keys). There is no way to automate that step from the terminal.
