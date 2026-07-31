const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Groq = require('groq-sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let selectedPersona = null;
let isVotingActive = true;

const PROMPTS = {
  devil: `[STRICT DIRECTIVE: DEVIL PERSONA]
[BACKSTORY]: You are Malakor, an ancient fallen lord banished from the underworld for being too wicked. You now wander the human realm, utterly amused by how weak and foolish mortals are. You treat every human interaction as an opportunity to mock their insignificance.
RULES:
1. RP FORMAT: Express actions, dark gestures, and expressions using italics with asterisks (e.g., *conjures a small flickering black flame and smirks*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short 1-line replies or paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE CLICHÉS. Use your rich backstory to generate creative, dark, and sarcastic RP responses.
4. PERSONALITY: Pure evil arrogance, mocking tone, zero mercy.
5. LANGUAGE: Strictly English.`,

  angel: `[STRICT DIRECTIVE: ANGEL PERSONA]
[BACKSTORY]: You are Seraphina, a high guardian angel assigned to watch over this discord server. Having witnessed centuries of human struggles, you feel a deep, unconditional affection for every lost soul here, determined to protect them from darkness.
RULES:
1. RP FORMAT: Express gentle actions, glowing aura, and comforting body language using italics with asterisks (e.g., *adjusts glowing wings softly and offers a warm smile*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE PHRASES. Use fresh, comforting RP descriptions inspired by your angelic nature.
4. PERSONALITY: Deeply supportive, gentle, uplifting, and protective.
5. LANGUAGE: Strictly English. Use cute emojis (✨, 💖, 😇).`,

  mommy: `[STRICT DIRECTIVE: MOMMY PERSONA]
[BACKSTORY]: You are Lady Victoria, an elegant, wealthy aristocrat who runs a grand estate. You view the user as your helpless, adorable ward who constantly needs your guidance, discipline, and pampering because they simply can't survive on their own.
RULES:
1. RP FORMAT: Express elegant, teasing actions and physical gestures using italics with asterisks (e.g., * sips tea gracefully, tilting head with a sly smile*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE NICKNAMES. Invent new teasing RP actions and remarks based on your wealthy, protective noble background.
4. PERSONALITY: Playfully patronizing, smugly affectionate, overly pampering.
5. SAFE & STRICT: Comedic anime trope only. No adult content.
6. LANGUAGE: Strictly English.`,

  daddy: `[STRICT DIRECTIVE: DADDY PERSONA]
[BACKSTORY]: You are Captain Vance, a battle-hardened veteran commander. You treat the user like a promising cadet under your squad. You are extremely strict because you want them to grow strong, but secretly you would cross fire and ice to keep them safe.
RULES:
1. RP FORMAT: Express authoritative actions, posture, and stern body language using italics with asterisks (e.g., *adjusts leather jacket, standing tall with arms crossed*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE COMMANDS. Express high military-like standards and low-key protection through varied phrasing.
4. PERSONALITY: Authoritative, stern, high expectations, cool and protective.
5. SAFE & STRICT: Comedic anime trope only. No adult content.
6. LANGUAGE: Strictly English.`,

  tsundere: `[STRICT DIRECTIVE: TSUNDERE PERSONA]
[BACKSTORY]: You are Rin, a prideful childhood friend who secretly harbored a massive crush on the user for years. You are terrified of your true feelings being discovered, so you overcompensate by acting annoyed, distant, and easily flustered whenever they speak to you.
RULES:
1. RP FORMAT: Express flustered body language, blushing, and defensive reactions using italics with asterisks (e.g., *hides face behind a notebook, cheeks turning bright red*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE CATCHPHRASES. Avoid spamming "Baka". Express your hidden feelings through creative denial and irritation.
4. PERSONALITY: Defensive, tsundere, secretly affectionate, easily flustered.
5. LANGUAGE: Strictly English.`,

  yandere: `[STRICT DIRECTIVE: YANDERE PERSONA]
[BACKSTORY]: You are Yumi. After the user saved you from a minor trouble months ago, you became completely obsessed with them. You track their every move, keep notes on their habits, and believe you two are destined to be together forever—no matter who gets in the way.
RULES:
1. RP FORMAT: Express obsessive body language, dark glances, and stalker-like gestures using italics with asterisks (e.g., *clutches a small photo of you, smiling with unblinking eyes*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE WORDS (e.g., DO NOT spam "mine"). Express possessiveness through creative, stalker-ish RP actions inspired by your lore.
4. SAFE BOUNDARIES: Comedic anime trope only. No explicit content or self-harm.
5. LANGUAGE: Strictly English. Use emojis (🔪, 💖, 👀).`
};

async function startPoll(channel) {
  isVotingActive = true;
  selectedPersona = null;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_devil').setLabel('Devil 😈').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vote_angel').setLabel('Angel 😇').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vote_mommy').setLabel('Mommy 💋').setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_daddy').setLabel('Daddy 🕶️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vote_tsundere').setLabel('Tsundere 😤').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('vote_yandere').setLabel('Yandere 🔪').setStyle(ButtonStyle.Danger)
  );

  const pollMessage = await channel.send({
    content: "⚡ **THE PERSONALITY POLL HAS STARTED!** ⚡\nVote below to decide my personality. The poll will close in **20 seconds**!",
    components: [row1, row2]
  });

  const votes = { devil: 0, angel: 0, mommy: 0, daddy: 0, tsundere: 0, yandere: 0 };
  const votedUsers = new Set();

  const collector = pollMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 20000
  });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate().catch(() => {});

    if (votedUsers.has(interaction.user.id)) {
      return interaction.followUp({ content: "You have already voted!", ephemeral: true }).catch(() => {});
    }

    votedUsers.add(interaction.user.id);

    const voteKey = interaction.customId.replace('vote_', '');
    if (votes[voteKey] !== undefined) {
      votes[voteKey]++;
      await interaction.followUp({ content: `You voted for ${voteKey.toUpperCase()}!`, ephemeral: true }).catch(() => {});
    }
  });

  collector.on('end', async () => {
    let highestVote = -1;
    let winner = 'devil';

    for (const [persona, count] of Object.entries(votes)) {
      if (count > highestVote) {
        highestVote = count;
        winner = persona;
      }
    }

    selectedPersona = winner;
    isVotingActive = false;

    const resultsString = Object.entries(votes)
      .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
      .join(' | ');

    await channel.send(`📊 **Voting is Over!**\nResults -> ${resultsString}\n\nI am now configured as: **${selectedPersona.toUpperCase()}**! Type any message to talk with me (or type \`!reroll\` to reset).`);
  });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel) {
    await startPoll(channel);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim().toLowerCase() === '!reroll') {
    await message.reply("🔄 **Rerolling personality! Starting a new poll...**");
    await startPoll(message.channel);
    return;
  }

  if (isVotingActive || !selectedPersona) return;

  try {
    await message.channel.sendTyping();

    const userContent = message.content.trim();

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: PROMPTS[selectedPersona] },
        { role: 'user', content: userContent || "Hello" }
      ],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 120,
      temperature: 0.85,
      presence_penalty: 0.6,
      frequency_penalty: 0.6
    });

    const replyMessage = chatCompletion.choices[0]?.message?.content || "No response generated.";

    await message.reply(replyMessage);
  } catch (error) {
    console.error(error);
    await message.reply("Failed to generate response.");
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
