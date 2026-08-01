require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        if (!guild) {
            console.error("Serveur introuvable avec cet ID !");
            process.exit(1);
        }

        console.log(`Serveur trouvé : ${guild.name}. Création des salons en cours...`);

        // Fonction utilitaire pour créer une catégorie
        async function createCategory(name) {
            return await guild.channels.create({
                name: name,
                type: ChannelType.GuildCategory,
            });
        }

        // ⛩️・UXDER ACCUEIL
        const catAccueil = await createCategory('⛩️・UXDER ACCUEIL');
        await guild.channels.create({ name: '📜・règlement', type: ChannelType.GuildText, parent: catAccueil.id });
        await guild.channels.create({ name: '📢・annonces', type: ChannelType.GuildText, parent: catAccueil.id });
        await guild.channels.create({ name: '🌸・bienvenue', type: ChannelType.GuildText, parent: catAccueil.id });
        await guild.channels.create({ name: '🎉・giveaways', type: ChannelType.GuildText, parent: catAccueil.id });

        // 🏮・UXDER TEXTUEL
        const catTextuel = await createCategory('🏮・UXDER TEXTUEL');
        await guild.channels.create({ name: '💬・général', type: ChannelType.GuildText, parent: catTextuel.id });
        await guild.channels.create({ name: '🤖・commandes', type: ChannelType.GuildText, parent: catTextuel.id });
        await guild.channels.create({ name: '📸・médias', type: ChannelType.GuildText, parent: catTextuel.id });
        await guild.channels.create({ name: '💡・suggestions', type: ChannelType.GuildText, parent: catTextuel.id });

        // 🏯・UXDER VOCAL
        const catVocal = await createCategory('🏯・UXDER VOCAL');
        const vocalNames = [
            '🎋 Vocal 1', '🎐 Vocal 2', '👺 Vocal 3', '🦊 Vocal 4', '🍣 Vocal 5',
            '🥢 Vocal 6', '🍜 Vocal 7', '🍵 Vocal 8', '🎌 Vocal 9', '🐉 Vocal 10', '🧘 AFK'
        ];

        for (const name of vocalNames) {
            await guild.channels.create({
                name: name,
                type: ChannelType.GuildVoice,
                parent: catVocal.id
            });
        }

        console.log("Les salons ont été créés avec succès !");
    } catch (error) {
        console.error("Erreur lors de la création :", error);
    }
    
    console.log("Fermeture du bot...");
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
