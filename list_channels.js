require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();
    channels.filter(c => c.type === ChannelType.GuildText).forEach(c => {
        console.log(`"${c.name}"`);
    });
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
