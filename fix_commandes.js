require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channels = await guild.channels.fetch();
        const commandesChannel = channels.find(c => c.name === '🤖・commandes');
        const ticketChannel = channels.find(c => c.name === '🎫・tickets');

        if (commandesChannel) {
            const messages = await commandesChannel.messages.fetch({ limit: 10 });
            // Trouver le message envoyé par le bot
            const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);
            
            if (botMessage) {
                const commandesEmbed = new EmbedBuilder()
                    .setColor('#5eff00')
                    .setTitle('🤖 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐔𝐓𝐈𝐋𝐄𝐒 ⛩️')
                    .setDescription(`Bienvenue dans <#${commandesChannel.id}> ! C'est ici que tu peux utiliser les bots du serveur.`)
                    .addFields(
                        { name: '📊 Tes Statistiques Personnelles', value: 'Tape la commande **`/stat me`** pour voir ta carte avec ton temps de vocal et tes messages envoyés !' },
                        { name: '🎫 Contacter le Staff', value: ticketChannel ? `En cas de problème, rends-toi dans le salon <#${ticketChannel.id}>.` : 'Rends-toi dans le salon tickets.' }
                    )
                    .setFooter({ text: 'UXDER • Espace Commandes' })
                    .setTimestamp();

                await botMessage.edit({ embeds: [commandesEmbed] });
                console.log("Le message des commandes a été corrigé (stat server retiré).");
            } else {
                console.log("Impossible de trouver le message dans le salon.");
            }
        } else {
            console.log("Salon commandes introuvable.");
        }
    } catch (error) {
        console.error("Erreur :", error);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
