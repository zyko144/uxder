require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        console.log(`🔧 Configuration des permissions sur ${guild.name}...`);

        // 1. Gérer les rôles
        let memberRole = guild.roles.cache.find(r => r.name.includes('Member') || r.name.includes('Membre'));
        if (!memberRole) {
            console.log("Création du rôle 👤・Member...");
            memberRole = await guild.roles.create({
                name: '👤・Member',
                color: '#3498db',
                permissions: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            });
        }

        let visitorRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('visiteur'));
        if (!visitorRole) {
            console.log("Création du rôle Visiteur...");
            visitorRole = await guild.roles.create({
                name: '👀・Visiteur',
                color: '#95a5a6',
                permissions: [] // Aucune permission
            });
        }

        // 2. Bloquer @everyone
        const everyoneRole = guild.roles.everyone;
        await everyoneRole.setPermissions(everyoneRole.permissions.remove(PermissionFlagsBits.ViewChannel));
        console.log("✅ @everyone ne peut plus voir les salons par défaut.");

        // 3. Donner ViewChannel à 👤・Member
        await memberRole.setPermissions(memberRole.permissions.add(PermissionFlagsBits.ViewChannel));
        console.log("✅ 👤・Member peut voir les salons.");

        // 4. Configurer le salon bienvenue
        const bienvenue = guild.channels.cache.find(c => c.name === '🌸・bienvenue');
        if (bienvenue) {
            await bienvenue.permissionOverwrites.edit(everyoneRole.id, {
                ViewChannel: true,
                SendMessages: false
            });
            console.log("✅ Salon bienvenue configuré pour être visible par tous !");
        }

        // Afficher l'ID du rôle Member pour le mettre à jour dans index.js
        console.log(`\n👉 ID du rôle Member : ${memberRole.id}`);
        console.log(`👉 ID du rôle Visiteur : ${visitorRole.id}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
