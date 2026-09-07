---
title: "Quick Start: Get ShiguangGateway Running in 3 Minutes"
version: 3.8.50
lastUpdated: 2026-08-06
---

# Quick Start: Get ShiguangGateway Running in 3 Minutes

> **TL;DR**: Install → Connect a free provider → Point your IDE to ShiguangGateway. Done.

---

## Step 1: Install ShiguangGateway

Choose your preferred method:

### Option A: npm (Recommended)

```bash
npm install -g shiguang-gateway
```

### Option B: Docker

```bash
docker run -d --name shiguang-gateway -p 20128:20128 diegosouzapw/shiguang-gateway:latest
```

`:latest` is the highest **published** stable SemVer. It does **not** track git `main`. Pin `diegosouzapw/shiguang-gateway:X.Y.Z` for GitOps. See [Image Tags / Release Channels](../guides/DOCKER_GUIDE.md#release-channels).

### Option C: From Source

```bash
git clone https://github.com/diegosouzapw/ShiguangGateway.git
cd ShiguangGateway
npm install
npm run dev
```

---

## Step 2: Start ShiguangGateway

```bash
shiguang-gateway
```

ShiguangGateway starts at `http://localhost:20128`. The dashboard opens automatically.

---

## Step 3: Connect a Free Provider

You can use ShiguangGateway **without paying anything** by connecting a free provider.

### Option A: Kiro (Free Claude — No Credit Card)

1. Open the dashboard at `http://localhost:20128`
2. Go to **Providers** → **Add Provider**
3. Select **Kiro AI**
4. Click **Connect** (no API key needed!)
5. Done! You now have free access to Claude models.

### Option B: OpenCode Free (No Auth)

1. Open the dashboard at `http://localhost:20128`
2. Go to **Providers** → **Add Provider**
3. Select **OpenCode Free**
4. Click **Connect** (no API key needed!)
5. Done! You now have free access to multiple models.

### Option C: Pollinations (No Key Needed)

1. Open the dashboard at `http://localhost:20128`
2. Go to **Providers** → **Add Provider**
3. Select **Pollinations**
4. Click **Connect** (no API key needed!)
5. Done! You now have free access to GPT-5, Claude, Gemini, and more.

---

## Step 4: Verify It Works

From [API Keys](http://localhost:20128/dashboard/api-manager), create a new key. Store this key since it will not appear again. Do note that this key is for tools to access ShiguangGateway, not to access upstream providers.

```bash
curl http://localhost:20128/v1/models -H "Authorization: Bearer YOUR_KEY"
```

You should see your connected models listed.

---

## Step 5: Point Your IDE or CLI to ShiguangGateway

In your IDE or CLI tool, set:

```
Base URL: http://localhost:20128/v1
API Key:  [copy from Dashboard → Endpoints]
Model:    auto
```

That's it! Your IDE now uses ShiguangGateway with automatic provider selection.

### IDE Example: VSCode/Continue.dev

1. In VSCode, install the [Continue.dev](https://marketplace.visualstudio.com/items?itemName=Continue.continue) extension.
2. Update your `~/.continue/config.yaml` to add the following lines:

```
  - name: ShiguangGateway - Auto
    provider: openai
    model: auto
    apiBase: http://localhost:20128/v1
    apiKey: <YOUR_KEY>
```

3. In the Continue.dev chat pane, select `ShiguangGateway - Auto` and you will make requests to ShiguangGateway.
4. (Optional) Exercise for the reader - have your IDE update the `config.yaml` with all the other prebuilt configurations 😊

### CLI Example: Codex CLI

1. In your operating system, set the environment variable persistently.
   For macOS/Linux (add to your `~/.bashrc` or `~/.zshrc`):

```bash
export SHIGUANG_GATEWAY_API_KEY="<YOUR_KEY>"
```

For Windows (Command Prompt):

```
setx SHIGUANG_GATEWAY_API_KEY <YOUR_KEY>
```

2. Now let's launch Codex, but configured for ShiguangGateway. Run:

```
shiguang-gateway launch-codex --model auto
```

You can do this manually via `codex` and command line parameters to specify endpoint and api key, but with the above command, ShiguangGateway takes care of everything for you.

The same one-command launch works for other CLIs via the generic launcher — `shiguang-gateway run <target>` supports `claude`, `codex`, `aider`, `goose`, `opencode`, `qwen`, and `gemini` (see [CLI Integrations](../guides/CLI-INTEGRATIONS.md)).

3. The CLI should be sending requests to ShiguangGateway now.

### Confirm your tool is routing to ShiguangGateway

You can see the details of the request by clicking [Monitoring/Logs](http://localhost:20128/dashboard/logs) from the left sidebar. Clicking through shows you more details. As a side note, you can see what info gets sent up from your favorite harness. This is helpful from an educational and debugging perspective.

---

## What's Next?

- **[Auto-Combo Guide](./AUTO-COMBO-GUIDE.md)** — Let ShiguangGateway pick the best AI for you
- **[Providers Guide](./PROVIDERS-GUIDE.md)** — Connect more providers (free and paid)
- **[Free Tiers Guide](./FREE-TIERS-GUIDE.md)** — Get free AI with no credit card
- **[Troubleshooting](../guides/TROUBLESHOOTING.md)** — Fix common issues

---

## Common Questions

### "Do I need an API key?"

**No!** You can use free providers (Kiro, OpenCode Free, Pollinations) without any API key. Just connect them in the dashboard.

### "What is `auto`?"

`auto` tells ShiguangGateway to automatically pick the best provider for each request. It considers speed, cost, quality, and availability. See the [Auto-Combo Guide](./AUTO-COMBO-GUIDE.md) for details.

### "How much does it cost?"

ShiguangGateway itself is **free and open-source**. You only pay for the providers you use. Many providers have free tiers — see the [Free Tiers Guide](./FREE-TIERS-GUIDE.md).

### "Can I use it with Claude Code / Cursor / Copilot?"

**Yes!** ShiguangGateway works with any tool that supports OpenAI format. Just set the base URL to `http://localhost:20128/v1`. See the [CLI Tools Guide](../reference/CLI-TOOLS.md) for specific setup instructions.

### "What if a provider goes down?"

ShiguangGateway automatically skips failed providers and tries the next one. You don't need to do anything. See the [Auto-Combo Guide](./AUTO-COMBO-GUIDE.md) for details.

---

## Need Help?

- **[Troubleshooting](../guides/TROUBLESHOOTING.md)** — Common issues and fixes
- **[Discord](https://discord.gg/U47eFqAXCn)** — Community support
- **[GitHub Issues](https://github.com/diegosouzapw/ShiguangGateway/issues)** — Report bugs
