require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const MEMBER_ROLE_ID = '1532894458469679204';

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        console.log(`🔧 Ajout du rôle Member à tous les utilisateurs sur ${guild.name}...`);

        const members = await guild.members.fetch();
        let count = 0;

        for (const [id, member] of members) {
            if (!member.user.bot && !member.roles.cache.has(MEMBER_ROLE_ID)) {
                await member.roles.add(MEMBER_ROLE_ID).catch(() => {});
                count++;
            }
        }

        console.log(`✅ Rôle Member ajouté à ${count} membres !`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
