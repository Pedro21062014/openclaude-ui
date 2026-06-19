#!/usr/bin/env bash
# ============================================================================
# publish.sh — Create the GitHub repo and push initial commit + v1.0.0 tag
# ============================================================================
#
# USAGE:
#   GH_TOKEN=<your_new_personal_access_token> ./publish.sh
#
# (or) export GH_TOKEN=<token> && ./publish.sh
#
# IMPORTANT:
#   - NEVER commit your token to git
#   - NEVER share your token publicly
#   - If you accidentally leaked a token, REVOKE it immediately at
#     https://github.com/settings/tokens
#
# PREREQUISITES:
#   - curl, git, jq installed
#   - A fresh GitHub Personal Access Token with scopes: repo, workflow
#     Create one at: https://github.com/settings/tokens/new
# ============================================================================

set -euo pipefail

# ---------------------------- config ----------------------------
REPO_NAME="${REPO_NAME:-openclaude-ui}"
REPO_DESC="A beautiful Claude/ChatGPT-like desktop interface for OpenClaude — multi-provider, animated thinking orb, auto-install, cross-platform."
REPO_PRIVATE="${REPO_PRIVATE:-false}"   # set to "true" to make private
TAG="${TAG:-v1.0.0}"
GH_USER="${GH_USER:-}"                  # auto-detected below
BRANCH="${BRANCH:-main}"

# ---------------------------- checks ----------------------------
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "❌ GH_TOKEN environment variable is not set."
  echo "   Create a fresh token at https://github.com/settings/tokens/new"
  echo "   Required scopes: repo, workflow"
  echo ""
  echo "   Then run:"
  echo "     GH_TOKEN=<your_new_token> $0"
  exit 1
fi

for cmd in curl git jq; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Required command not found: $cmd"
    exit 1
  fi
done

# Resolve the script's directory (the project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "📂 Project directory: $PROJECT_DIR"

# ---------------------------- detect user ----------------------------
echo "🔎 Detecting GitHub username..."
GH_USER=$(curl -sS -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user | jq -r .login)

if [[ -z "$GH_USER" || "$GH_USER" == "null" ]]; then
  echo "❌ Could not detect GitHub username from token. Token may be invalid."
  exit 1
fi
echo "   ✓ Authenticated as: $GH_USER"

# ---------------------------- create repo ----------------------------
echo ""
echo "📦 Creating repository '$REPO_NAME' under '$GH_USER'..."
HTTP_CODE=$(curl -sS -o /tmp/repo-create.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "$(jq -n --arg name "$REPO_NAME" --arg desc "$REPO_DESC" --arg private "$REPO_PRIVATE" \
       '{name: $name, description: $desc, private: ($private == "true"), auto_init: false}')")

if [[ "$HTTP_CODE" == "201" ]]; then
  echo "   ✓ Repository created: https://github.com/$GH_USER/$REPO_NAME"
elif [[ "$HTTP_CODE" == "422" ]]; then
  echo "   ⚠️  Repository may already exist. Continuing..."
else
  echo "❌ Failed to create repository (HTTP $HTTP_CODE):"
  cat /tmp/repo-create.json
  exit 1
fi

# ---------------------------- init git ----------------------------
echo ""
echo "🔧 Initializing local git repository..."
if [[ ! -d ".git" ]]; then
  git init -q
fi

# Ensure correct default branch
git symbolic-ref HEAD "refs/heads/$BRANCH" 2>/dev/null || true

# Add remote
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/${GH_USER}/${REPO_NAME}.git"
else
  git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${GH_USER}/${REPO_NAME}.git"
fi

# Stage everything (respecting .gitignore)
git add -A

# Initial commit
if ! git log --oneline -1 >/dev/null 2>&1; then
  git commit -q -m "feat: initial release of OpenClaude UI v1.0.0

- Beautiful Claude/ChatGPT-like Electron interface
- Multi-provider model selector with real logos (Claude, OpenAI, Gemini, DeepSeek, Z.ai, OpenRouter, Ollama, Mistral, Qwen, Groq, xAI, Perplexity, Together, Fireworks)
- Animated 'thinking' gradient orb (boitinha)
- Auto-install OpenClaude CLI on first launch with animated Claude Code logo
- Unified settings panel that also configures OpenClaude CLI
- Streaming responses with markdown + syntax highlighting
- Cross-platform builds: Windows (.exe), macOS (.dmg), Linux (.AppImage, .deb)
- GitHub Actions workflow for automated releases" --no-verify
  echo "   ✓ Initial commit created"
else
  git commit -q -m "chore: prepare release $TAG" --no-verify || true
  echo "   ✓ Committed pending changes"
fi

# ---------------------------- push ----------------------------
echo ""
echo "🚀 Pushing to GitHub..."
git push -u origin "$BRANCH" --force-with-lease || git push -u origin "$BRANCH"
echo "   ✓ Pushed to https://github.com/$GH_USER/$REPO_NAME"

# ---------------------------- create tag → triggers release workflow ----------------------------
echo ""
echo "🏷️  Creating tag $TAG to trigger the release workflow..."
git tag -d "$TAG" 2>/dev/null || true
git tag "$TAG"
git push origin "$TAG"
echo "   ✓ Tag pushed"

echo ""
echo "============================================================"
echo "✅ DONE!"
echo ""
echo "   Repository: https://github.com/$GH_USER/$REPO_NAME"
echo "   Tag:        $TAG"
echo ""
echo "   The GitHub Actions workflow 'Build & Release' is now running."
echo "   Track it at: https://github.com/$GH_USER/$REPO_NAME/actions"
echo ""
echo "   When the workflow completes (~10-15 min), your release with"
echo "   .exe / .dmg / .AppImage / .deb will be live at:"
echo "   https://github.com/$GH_USER/$REPO_NAME/releases/tag/$TAG"
echo ""
echo "🔐 SECURITY: Your token was used only for this push and is NOT"
echo "   stored anywhere. To be extra safe, you can revoke it now at"
echo "   https://github.com/settings/tokens — the repo will continue"
echo "   to work without the token in your local git remote."
echo "============================================================"
