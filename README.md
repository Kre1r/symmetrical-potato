# Discord AI Bot (Devil/Angel)

A simple Discord AI bot built with `discord.js` and the `@google/genai` SDK. On startup, it launches a 60-second poll asking users to choose its persona: **Devil** (aggressive roasting) or **Angel** (nauseatingly sweet). It runs directly inside GitHub Actions for testing purposes.

---

## Prerequisites

1. **Discord Bot Token**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications).
   - Create a new application and navigate to the **Bot** tab.
   - Enable **Message Content Intent** under *Privileged Gateway Intents*.
   - Copy the bot **Token**.

2. **Gemini API Key**:
   - Get an API key from Google AI Studio.

3. **Discord Channel ID**:
   - Enable Developer Mode in Discord settings.
   - Right-click the channel where you want the poll to be created and copy the **Channel ID**.

---

## Setup & GitHub Actions Deployment

1. Push all project files to your GitHub repository.
2. Go to your repository settings on GitHub:
   - `Settings` -> `Secrets and variables` -> `Actions`
3. Click **New repository secret** and add the following three secrets:
   - `DISCORD_BOT_TOKEN`: Your Discord bot token.
   - `DISCORD_CHANNEL_ID`: The target channel ID for the initial poll.
   - `GEMINI_API_KEY`: Your Gemini API key.

---

## Usage

1. Go to the **Actions** tab in your GitHub repository.
2. Select the **Discord AI Bot Runner** workflow on the left side.
3. Click **Run workflow**.
4. Check your Discord server:
   - The bot will log in and send a poll message with two buttons (**Devil** / **Angel**).
   - Members have 60 seconds to vote.
   - Once voting ends, tag `@BotName` in any message to chat with the chosen persona.
