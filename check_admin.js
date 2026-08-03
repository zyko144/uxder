require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const me = guild.members.me;
    console.log("Admin ?", me.permissions.has(PermissionFlagsBits.Administrator));
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
