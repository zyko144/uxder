require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        console.log(`🔧 Correction des permissions STAFF sur ${guild.name}...`);

        const memberRole = guild.roles.cache.find(r => r.name.includes('Member') || r.name.includes('Membre'));
        const visitorRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('visiteur'));
        const everyoneRole = guild.roles.everyone;

        if (!memberRole) {
            console.log("❌ Rôle Member introuvable !");
            process.exit(1);
        }

        const channels = await guild.channels.fetch();
        
        // Trouver la catégorie staff
        const staffCategory = channels.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('staff'));

        if (staffCategory) {
            // Refuser explicitement l'accès à la catégorie Staff
            await staffCategory.permissionOverwrites.edit(memberRole.id, { ViewChannel: false }).catch(() => {});
            await staffCategory.permissionOverwrites.edit(everyoneRole.id, { ViewChannel: false }).catch(() => {});
            if (visitorRole) await staffCategory.permissionOverwrites.edit(visitorRole.id, { ViewChannel: false }).catch(() => {});

            // Appliquer à tous les salons de cette catégorie
            const staffChannels = channels.filter(c => c.parentId === staffCategory.id);
            for (const [id, channel] of staffChannels) {
                await channel.permissionOverwrites.edit(memberRole.id, { ViewChannel: false }).catch(() => {});
                await channel.permissionOverwrites.edit(everyoneRole.id, { ViewChannel: false }).catch(() => {});
                if (visitorRole) await channel.permissionOverwrites.edit(visitorRole.id, { ViewChannel: false }).catch(() => {});
                console.log(`🔒 Verrouillé pour les membres : ${channel.name}`);
            }
        }

        // Aussi bloquer manuellement tous les salons dont le nom est staff, logs, sanctions
        for (const [id, channel] of channels) {
            if (channel.name && (channel.name.includes('staff') || channel.name.includes('sanctions') || channel.name.includes('logs'))) {
                await channel.permissionOverwrites.edit(memberRole.id, { ViewChannel: false }).catch(() => {});
                console.log(`🔒 Verrouillé manuellement : ${channel.name}`);
            }
        }

        console.log("✅ L'espace Staff est maintenant totalement invisible pour les membres classiques !");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
