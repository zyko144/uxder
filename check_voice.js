require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        const me = guild.members.me;
        
        console.log("Bot mute ?", me.voice.serverMute);
        console.log("Bot deaf ?", me.voice.serverDeaf);
        console.log("Bot self mute ?", me.voice.selfMute);
        console.log("Bot self deaf ?", me.voice.selfDeaf);
        console.log("Bot in voice ?", me.voice.channel?.name || "non");
        
        // Vérif permissions "Speak" dans tous les vocaux
        const vocs = guild.channels.cache.filter(c => c.type === 2); // GuildVoice
        for (const [id, ch] of vocs) {
            const perms = ch.permissionsFor(me);
            console.log(`\n${ch.name}:`);
            console.log("  CONNECT:", perms.has('Connect'));
            console.log("  SPEAK:", perms.has('Speak'));
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
