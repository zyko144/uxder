require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
    console.log("Ajout des salons communautaires...");
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channels = await guild.channels.fetch();
        
        // Vérifier si la catégorie existe déjà
        let divCat = channels.find(c => c.name === '🎮・UXDER DIVERTISSEMENT' && c.type === ChannelType.GuildCategory);
        if (!divCat) {
            divCat = await guild.channels.create({
                name: '🎮・UXDER DIVERTISSEMENT',
                type: ChannelType.GuildCategory,
            });
            await guild.channels.create({ name: '🎮・gaming', type: ChannelType.GuildText, parent: divCat.id });
            await guild.channels.create({ name: '🎨・créations', type: ChannelType.GuildText, parent: divCat.id });
            await guild.channels.create({ name: '🎵・musique', type: ChannelType.GuildText, parent: divCat.id });
            await guild.channels.create({ name: '🏆・niveaux', type: ChannelType.GuildText, parent: divCat.id });
            console.log("Catégorie Divertissement et ses salons créés.");
        } else {
            console.log("La catégorie Divertissement existe déjà.");
        }

        // Ajouter partenariats
        const catAccueil = channels.find(c => c.name === '⛩️・UXDER ACCUEIL' && c.type === ChannelType.GuildCategory);
        if (catAccueil && !channels.find(c => c.name === '🤝・partenariats')) {
            await guild.channels.create({ name: '🤝・partenariats', type: ChannelType.GuildText, parent: catAccueil.id });
            console.log("Salon partenariats ajouté.");
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
