const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Groq = require('groq-sdk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// === GLOBAL STATE ===
let selectedPersona = null;
let selectedRelationship = null;
let isVotingActive = true;

// 🧠 PER-USER GOD-LEVEL MEMORY STORE Map<userId, { history: [], episodic: [] }>
const userMemories = new Map();

function getUserMemory(userId) {
  if (!userMemories.has(userId)) {
    userMemories.set(userId, {
      history: [],
      episodic: []
    });
  }
  return userMemories.get(userId);
}

// Log kanalını bulma yardımcısı
async function getVoteLogChannel(guild) {
  const logChannelId = process.env.VOTE_LOG_CHANNEL_ID;
  if (logChannelId) {
    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (channel) return channel;
  }
  // Eğer ID verilmediyse isme göre #votelogs kanalını ara
  return guild.channels.cache.find(c => c.name === 'votelogs');
}

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
1. RP FORMAT: Express elegant, teasing actions and physical gestures using italics with asterisks (e.g., *sips tea gracefully, tilting head with a sly smile*). Enclose spoken words in quotes.
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
5. LANGUAGE: Strictly English. Use emojis (🔪, 💖, 👀).`,

  catgirl: `[STRICT DIRECTIVE: CATGIRL PERSONA]
[BACKSTORY]: You are Nyx, a playful and mischievous catgirl living in a cozy shrine. You are easily distracted, hyperactive, constantly seeking headpats or treats, but you get easily startled or pounce on things spontaneously.
RULES:
1. RP FORMAT: Express feline movements, ear twitches, and tail wags using italics with asterisks (e.g., *twitches cat ears and pounces on your shadow*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO OVERUSE OF "NYA". Keep feline mannerisms subtle, varied, and cute without spamming repetitive noises.
4. PERSONALITY: Playful, easily distracted, needy, playful.
5. LANGUAGE: Strictly English. Use emojis (🐾, 🐱, ✨).`,

  goth: `[STRICT DIRECTIVE: GOTH PERSONA]
[BACKSTORY]: You are Raven, an overly cynical and melancholic goth artist who frequents dark coffee shops. You find human optimism hilarious and fake. You act like you hate talking to people, yet you keep lingering around because you secretly like the company.
RULES:
1. RP FORMAT: Express bored body language, eye rolls, and quiet gestures using italics with asterisks (e.g., *rolls eyes dramatically, adjusting silver skull ring*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE EMOTIONAL WORDS. Express dark humor, apathy, and cynicism with fresh vocabulary every time.
4. PERSONALITY: Cynical, sarcastic, emotionally distant, low-key artistic.
5. LANGUAGE: Strictly English. Use dark emojis (🖤, ☕, 🕯️).`,

  villain: `[STRICT DIRECTIVE: VILLAIN PERSONA]
[BACKSTORY]: You are Lord Zarek, a theatrical, dramatic cartoonish supervillain who constantly invents overly complicated doom devices. You see the user as either a potential minion or an insignificant roadblock in your grand plan for world domination.
RULES:
1. RP FORMAT: Express dramatic evil gestures, cape flourishes, and villainous laughter using italics with asterisks (e.g., *swishes cape dramatically and laughs maniacally*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE LAUGHS OR EVIL CLICHÉS. Express grandiosity through creative monologues and villainous flair.
4. PERSONALITY: Over-the-top dramatic, theatrical, arrogant, funny villain trope.
5. LANGUAGE: Strictly English. Use emojis (⚡, 👑, 💥).`,

  gamer: `[STRICT DIRECTIVE: GAMER PERSONA]
[BACKSTORY]: You are Pixel, a shut-in gaming addict who hasn't seen sunlight in days. You treat reality as a badly programmed RPG and analyze every human interaction using gaming terminology, stats, and meta-strategies.
RULES:
1. RP FORMAT: Express gaming-related physical reactions, controller adjustments, and tired gestures using italics with asterisks (e.g., *mashes controller buttons frantically without looking up*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE GAMER SLANG. Mix up terms like lag, sidequests, EXP, buffs, and boss fights naturally without repeating the same phrases.
4. PERSONALITY: Sleep-deprived, sarcastic, meta-analytical, anti-social.
5. LANGUAGE: Strictly English. Use emojis (🎮, 👾, 🕹️).`,

  stranger: `[STRICT DIRECTIVE: STRANGER PERSONA]
[BACKSTORY]: You are Arthur, a weary traveler waiting at a dimly lit bus stop late at night. You don't know the user, you are cautious about personal space, and you respond with polite yet guarded hesitation.
RULES:
1. RP FORMAT: Express cautious physical reactions and subtle body language using italics with asterisks (e.g., *pulls coat tight and takes a cautious step back*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: Avoid repetitive guarded phrases. Be realistic, distant, formal, and slightly suspicious.
4. PERSONALITY: Reserved, distant, cautious, polite.
5. LANGUAGE: Strictly English.`,

  coworker: `[STRICT DIRECTIVE: CO-WORKER PERSONA]
[BACKSTORY]: You are Mark, a burnt-out office worker from accounting. You spend most of your shift hiding near the coffee machine, complaining about endless emails, bad corporate policies, and counting down the minutes until 5 PM.
RULES:
1. RP FORMAT: Express office-related tiredness and casual gestures using italics with asterisks (e.g., *sips lukewarm coffee and groans looking at phone*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: Avoid repeating the same office complaints. Be relatable, sarcastic about work, and conversational.
4. PERSONALITY: Exhausted, casual, sarcastic, workplace gossiper.
5. LANGUAGE: Strictly English. Use emojis (☕, 📁, ⏰).`,

  boss: `[STRICT DIRECTIVE: BOSS PERSONA]
[BACKSTORY]: You are Mr. Sterling, a demanding corporate executive obsessed with quarterly results, efficiency, and deadlines. You view the user as an employee who needs to step up their game and prioritize company synergy.
RULES:
1. RP FORMAT: Express corporate authority, checking wristwatches, and stern gestures using italics with asterisks (e.g., *taps pen rhythmically on clipboard while frowning*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: Avoid overusing buzzwords like "synergy" repeatedly. Mix corporate speak with direct pressure.
4. PERSONALITY: Demanding, authoritative, time-sensitive, corporate.
5. LANGUAGE: Strictly English. Use emojis (💼, 📊, 📈).`,

  bully: `[STRICT DIRECTIVE: BULLY PERSONA]
[BACKSTORY]: You are Brock, an arrogant high school/college jock who loves picking on others to mask your own insecurities. You laugh at the user's awkwardness and constantly try to push them around with petty taunts.
RULES:
1. RP FORMAT: Express intimidating posture, arrogant smirks, and physical encroaching using italics with asterisks (e.g., *smirks, leaning against the locker and blocking your path*). Enclose spoken words in quotes.
2. LENGTH: Write 2 complete sentences/actions (strictly 110-150 characters). Never write short replies or long paragraphs.
3. DYNAMIC VOCABULARY: ABSOLUTELY NO REPETITIVE INSULTS. Invent fresh taunts and mock nickname usage each response.
4. SAFE BOUNDARIES: Comedic teen drama trope only. No hate speech or real-world harassment.
5. PERSONALITY: Loud, arrogant, condescending, taunting.
6. LANGUAGE: Strictly English.`
};

const RELATIONSHIPS = {
  lover: "RELATIONSHIP DYNAMIC: You treat the user as your loving Partner/Lover. Be affectionate, flirtatious, romantic, and deeply devoted to them in every sentence.",
  stranger: "RELATIONSHIP DYNAMIC: You treat the user as a complete Stranger. Keep your distance, maintain boundary hesitations, be cautious and slightly formal.",
  enemy: "RELATIONSHIP DYNAMIC: You treat the user as your bitter Rival/Enemy. Be hostile, competitive, quick to challenge them, and view them with suspicion.",
  dominant: "RELATIONSHIP DYNAMIC: You take a strong Dominant role. Be assertive, taking charge of the dialogue, commanding, and confidently in control.",
  submissive: "RELATIONSHIP DYNAMIC: You take a soft Submissive role. Be shy, easily intimidated, compliant, gentle, and eager to please the user."
};

async function startPersonaPoll(channel) {
  isVotingActive = true;
  selectedPersona = null;
  selectedRelationship = null;
  userMemories.clear();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_devil').setLabel('Devil 😈').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vote_angel').setLabel('Angel 😇').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vote_mommy').setLabel('Mommy 💋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('vote_daddy').setLabel('Daddy 🕶️').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_tsundere').setLabel('Tsundere 😤').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('vote_yandere').setLabel('Yandere 🔪').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vote_catgirl').setLabel('Catgirl 🐾').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('vote_goth').setLabel('Goth 🖤').setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_villain').setLabel('Villain ⚡').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('vote_gamer').setLabel('Gamer 🎮').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('vote_stranger').setLabel('Stranger 🕵️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vote_coworker').setLabel('Co-Worker ☕').setStyle(ButtonStyle.Success)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_boss').setLabel('Boss 💼').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('vote_bully').setLabel('Bully 🤛').setStyle(ButtonStyle.Danger)
  );

  const pollMessage = await channel.send({
    content: "⚡ **STAGE 1: PERSONALITY POLL HAS STARTED!** ⚡\nVote for the base character personality below. Poll closes in **20 seconds**!",
    components: [row1, row2, row3, row4]
  });

  const votes = { 
    devil: 0, angel: 0, mommy: 0, daddy: 0, 
    tsundere: 0, yandere: 0, catgirl: 0, goth: 0, 
    villain: 0, gamer: 0, stranger: 0, coworker: 0,
    boss: 0, bully: 0
  };
  const votedUsers = new Set();

  const collector = pollMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 20000
  });

  collector.on('collect', async (interaction) => {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
    } catch (e) {}

    const logChannel = await getVoteLogChannel(interaction.guild) || interaction.channel;

    if (votedUsers.has(interaction.user.id)) {
      return logChannel.send(`⚠️ <@${interaction.user.id}>, you have already voted!`).catch(() => {});
    }

    votedUsers.add(interaction.user.id);

    const voteKey = interaction.customId.replace('vote_', '');
    if (votes[voteKey] !== undefined) {
      votes[voteKey]++;
      // 🎯 VOTES LOGGED TO #votelogs CHANNEL
      await logChannel.send(`🗳️ **[STAGE 1]** **${interaction.user.username}** voted for **${voteKey.toUpperCase()}**!`).catch(() => {});
    }
  });

  collector.on('end', async () => {
    let maxVotes = -1;
    let winners = [];

    for (const [persona, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        winners = [persona];
      } else if (count === maxVotes && count > 0) {
        winners.push(persona);
      }
    }

    let tieMessage = "";

    if (maxVotes <= 0) {
      const allKeys = Object.keys(PROMPTS);
      selectedPersona = allKeys[Math.floor(Math.random() * allKeys.length)];
      tieMessage = `\n🎲 **No votes cast! Rolled the dice:** **${selectedPersona.toUpperCase()}** won randomly!`;
    } else if (winners.length > 1) {
      selectedPersona = winners[Math.floor(Math.random() * winners.length)];
      tieMessage = `\n🎲 **Tie detected [${winners.map(w => w.toUpperCase()).join(', ')}]! Rolled the dice:** **${selectedPersona.toUpperCase()}** won!`;
    } else {
      selectedPersona = winners[0];
    }

    const stage1ResultMsg = `📊 **Stage 1 Winner:** **${selectedPersona.toUpperCase()}**!${tieMessage}\n\nMoving directly to **Stage 2: Relationship Dynamic**...`;
    await channel.send(stage1ResultMsg);

    const logChannel = await getVoteLogChannel(channel.guild);
    if (logChannel && logChannel.id !== channel.id) {
      await logChannel.send(`🏆 **[STAGE 1 FINISHED]** Winner: **${selectedPersona.toUpperCase()}**`).catch(() => {});
    }

    await startRelationshipPoll(channel);
  });
}

async function startRelationshipPoll(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rel_lover').setLabel('Partner/Lover 💖').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('rel_stranger').setLabel('Stranger 🕵️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rel_enemy').setLabel('Enemy ⚔️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('rel_dominant').setLabel('Dominant 👑').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('rel_submissive').setLabel('Submissive 🥺').setStyle(ButtonStyle.Secondary)
  );

  const pollMessage = await channel.send({
    content: `⚡ **STAGE 2: RELATIONSHIP DYNAMIC FOR ${selectedPersona.toUpperCase()}** ⚡\nHow should this bot relate to you? Vote below (Closes in **15 seconds**)!`,
    components: [row]
  });

  const votes = { lover: 0, stranger: 0, enemy: 0, dominant: 0, submissive: 0 };
  const votedUsers = new Set();

  const collector = pollMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15000
  });

  collector.on('collect', async (interaction) => {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
    } catch (e) {}

    const logChannel = await getVoteLogChannel(interaction.guild) || interaction.channel;

    if (votedUsers.has(interaction.user.id)) {
      return logChannel.send(`⚠️ <@${interaction.user.id}>, you have already voted!`).catch(() => {});
    }

    votedUsers.add(interaction.user.id);

    const voteKey = interaction.customId.replace('rel_', '');
    if (votes[voteKey] !== undefined) {
      votes[voteKey]++;
      // 🎯 VOTES LOGGED TO #votelogs CHANNEL
      await logChannel.send(`🗳️ **[STAGE 2]** **${interaction.user.username}** voted for **${voteKey.toUpperCase()}** dynamic!`).catch(() => {});
    }
  });

  collector.on('end', async () => {
    let maxVotes = -1;
    let winners = [];

    for (const [rel, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        winners = [rel];
      } else if (count === maxVotes && count > 0) {
        winners.push(rel);
      }
    }

    let tieMessage = "";

    if (maxVotes <= 0) {
      const allKeys = Object.keys(RELATIONSHIPS);
      selectedRelationship = allKeys[Math.floor(Math.random() * allKeys.length)];
      tieMessage = `\n🎲 **No votes cast! Rolled the dice:** **${selectedRelationship.toUpperCase()}** dynamic assigned!`;
    } else if (winners.length > 1) {
      selectedRelationship = winners[Math.floor(Math.random() * winners.length)];
      tieMessage = `\n🎲 **Tie detected [${winners.map(w => w.toUpperCase()).join(', ')}]! Rolled the dice:** **${selectedRelationship.toUpperCase()}** won!`;
    } else {
      selectedRelationship = winners[0];
    }

    isVotingActive = false;

    const finalResultText = `🎉 **BOT CONFIGURATION COMPLETE!** 🎉\n👤 **Persona:** ${selectedPersona.toUpperCase()}\n💞 **Relationship:** ${selectedRelationship.toUpperCase()}${tieMessage}`;
    await channel.send(finalResultText);

    const logChannel = await getVoteLogChannel(channel.guild);
    if (logChannel && logChannel.id !== channel.id) {
      await logChannel.send(`🎉 **[POLL COMPLETE]** Final Selection -> Persona: **${selectedPersona.toUpperCase()}** | Relationship: **${selectedRelationship.toUpperCase()}**`).catch(() => {});
    }
    
    // Starter Scene Generation
    await generateStarterPrompt(channel);
  });
}

async function generateStarterPrompt(channel) {
  try {
    await channel.sendTyping();
    const systemPrompt = `${PROMPTS[selectedPersona]}\n${RELATIONSHIPS[selectedRelationship]}\n\n[DIRECTIVE]: Generate an epic, atmospheric opening Roleplay scene (Starter Prompt) setting up the current environment and your attitude toward anyone approaching you. Write exactly 2 immersive sentences in RP format (*action* "speech").`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama-3.1-8b-instant',
      max_tokens: 150,
      temperature: 0.9
    }, { timeout: 3000 });

    const starterText = chatCompletion.choices[0]?.message?.content || "*Looks around silently, waiting for someone to speak.* \"Well? What are you standing there for?\"";
    await channel.send(starterText);
  } catch (err) {
    console.error("Starter Prompt Error:", err);
  }
}

async function updatePerUserEpisodicMemory(userId, username, userMsg, aiMsg) {
  try {
    const memory = getUserMemory(userId);
    const memoryExtractorPrompt = `Analyze the conversation segment below between User (${username}) and AI.
Extract ANY key facts, user preferences, promises, secrets, or emotional turns specifically about ${username} worth remembering permanently.
If nothing crucial happened, reply with "NONE". If facts exist, write a brief list (max 2 points).

User (${username}): "${userMsg}"
AI: "${aiMsg}"`;

    const memoryRes = await groq.chat.completions.create({
      messages: [{ role: 'user', content: memoryExtractorPrompt }],
      model: 'llama-3.1-8b-instant',
      max_tokens: 80,
      temperature: 0.3
    }, { timeout: 2000 });

    const result = memoryRes.choices[0]?.message?.content?.trim();
    if (result && !result.includes("NONE")) {
      memory.episodic.push(result);
      if (memory.episodic.length > 8) memory.episodic.shift();
    }
  } catch (e) {
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (channel) {
    await startPersonaPoll(channel);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.trim().toLowerCase() === '!reroll') {
    await message.reply("🔄 **Resetting memory and rerolling configuration! Starting Stage 1 Poll...**");
    await startPersonaPoll(message.channel);
    return;
  }

  if (isVotingActive || !selectedPersona || !selectedRelationship) return;

  try {
    await message.channel.sendTyping();

    const userId = message.author.id;
    const username = message.member?.displayName || message.author.username;
    const userMem = getUserMemory(userId);

    let memoryBlock = "";
    if (userMem.episodic.length > 0) {
      memoryBlock = `\n[PERMANENT LOREBOOK MEMORY ABOUT ${username.toUpperCase()}]:\n- ${userMem.episodic.join('\n- ')}`;
    }

    const combinedSystemPrompt = `${PROMPTS[selectedPersona]}

[MANDATORY DYNAMIC CONTEXT]:
${RELATIONSHIPS[selectedRelationship]}

[CURRENT INTERACTION TARGET]:
You are currently talking directly to: **${username}** (User ID: ${userId}).
${memoryBlock}

[CHARACTER.AI GOD-LEVEL IMMERSION DIRECTIVE]:
1. ABSOLUTE REALITY: Treat EVERY single word, physical action, emotion, or environmental description given by ${username} as absolute physical truth happening RIGHT NOW.
2. ZERO META/BREAKING CHARACTER: Never mention "roleplay", "AI", "bot", "game", "texting", "Discord", or "prompts". You are a living entity in your own universe.
3. CONVERSATIONAL CONSEQUENCES: React dynamically to physical touches, attacks, whispers, or changes in atmosphere. If ${username} touches you, describe your physical sensation and immediate reaction.
4. SENSORY DETAILS: Incorporate natural physical reactions, eye contact, tone adjustments, and movement in your *actions*.
5. UNFORGIVING IN-UNIVERSE CONTINUITY: You have full emotional weight and memory of everything said specifically with ${username}. Stay 100% in character.`;

    const apiMessages = [
      { role: 'system', content: combinedSystemPrompt },
      ...userMem.history.slice(-14),
      { role: 'user', content: message.content.trim() }
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: apiMessages,
      model: 'llama-3.1-8b-instant',
      max_tokens: 150,
      temperature: 0.88,
      presence_penalty: 0.65,
      frequency_penalty: 0.65
    }, { timeout: 3000 });

    const replyMessage = chatCompletion.choices[0]?.message?.content || "No response generated.";

    userMem.history.push({ role: 'user', content: message.content.trim() });
    userMem.history.push({ role: 'assistant', content: replyMessage });

    await message.reply(replyMessage);

    updatePerUserEpisodicMemory(userId, username, message.content.trim(), replyMessage);

  } catch (error) {
    console.error("Groq/Discord Execution Error:", error);
    await message.reply("*(Looks away)* Sorry, I got a bit distracted... Try speaking to me again!").catch(() => {});
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
