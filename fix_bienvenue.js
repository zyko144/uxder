require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channels = await guild.channels.fetch();
        const bienvenueChannel = channels.find(c => c.name === '🌸・bienvenue');

        if (bienvenueChannel) {
            const messages = await bienvenueChannel.messages.fetch({ limit: 10 });
            // Trouver le message envoyé par le bot
            const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
            
            if (botMessage) {
                // Copier l'ancien embed et retirer l'image
                const oldEmbed = botMessage.embeds[0];
                const newEmbed = EmbedBuilder.from(oldEmbed);
                newEmbed.setImage(null);

                // Modifier le message existant
                await botMessage.edit({ embeds: [newEmbed] });
                console.log("Le message de bienvenue a été mis à jour avec succès (image supprimée).");
            } else {
                console.log("Impossible de trouver le message dans le salon.");
            }
        } else {
            console.log("Salon bienvenue introuvable.");
        }
    } catch (error) {
        console.error("Erreur :", error);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
