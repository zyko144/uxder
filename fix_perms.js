require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        console.log(`🔧 Correction des permissions sur les salons de ${guild.name}...`);

        const memberRole = guild.roles.cache.find(r => r.name.includes('Member') || r.name.includes('Membre'));
        if (!memberRole) {
            console.log("❌ Rôle Member introuvable !");
            process.exit(1);
        }

        // Parcourir tous les salons et catégories
        const channels = await guild.channels.fetch();
        let count = 0;

        for (const [id, channel] of channels) {
            // Ne pas modifier les salons admin/staff ni bienvenue
            if (channel.name && (
                channel.name.includes('staff') || 
                channel.name.includes('sanctions') || 
                channel.name.includes('logs') || 
                channel.name === '🌸・bienvenue'
            )) continue;

            // Ajouter une exception explicite pour le rôle Member (Voir les salons = OUI)
            // Cela force l'accès même si @everyone est refusé sur la catégorie.
            await channel.permissionOverwrites.edit(memberRole.id, {
                ViewChannel: true
            }).catch(() => {});
            count++;
        }

        console.log(`✅ Permissions corrigées sur ${count} salons/catégories ! Le rôle Member a maintenant un accès explicite partout.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
