# Discord AI Bot (Groq Powered with Hardened Personas)

A Discord AI bot built with `discord.js` and `groq-sdk`. On startup, it launches a 60-second poll asking users to choose its persona: **Devil** (ruthless, jailbreak-resistant roasting) or **Angel** (suffocatingly sweet, cringe-inducing love). It runs inside GitHub Actions for testing purposes.

---

## Prerequisites

1. **Discord Bot Token**:
   - Create an application at [Discord Developer Portal](https://discord.com/developers/applications).
   - Enable **Message Content Intent** under the **Bot** tab.
   - Copy the bot **Token**.

2. **Discord Channel ID**:
   - Enable Developer Mode in Discord settings.
   - Right-click the channel for the poll and copy its **Channel ID**.

3. **Groq API Key**:
   - Obtain an API key from the Groq console.

---

## GitHub Secrets Setup

Go to your repository: `Settings` -> `Secrets and variables` -> `Actions` and add the following **3 secrets**:

- `DISCORD_BOT_TOKEN`: Your Discord bot token.
- `DISCORD_CHANNEL_ID`: The channel ID where the poll will launch.
- `GROQ_API_KEY`: Your Groq API key.

---

## Usage

1. Go to the **Actions** tab in your repository.
2. Select **Discord AI Bot Runner** workflow.
3. Click **Run workflow**.
4. Check your Discord channel:
   - The bot posts a poll (**Devil** / **Angel**).
   - Users have 60 seconds to vote.
   - Tag `@BotName` in any message after the poll finishes to chat with the chosen persona.
