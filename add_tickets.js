require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ChannelType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
    console.log("Bot connecté pour la mise à jour des salons !");
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channels = await guild.channels.fetch();
        
        // 1. CREATE TICKET CHANNEL
        const catTextuel = channels.find(c => c.name === '🏮・UXDER TEXTUEL' && c.type === ChannelType.GuildCategory);
        let ticketChannel = channels.find(c => c.name === '🎫・tickets');
        
        if (!ticketChannel && catTextuel) {
            ticketChannel = await guild.channels.create({
                name: '🎫・tickets',
                type: ChannelType.GuildText,
                parent: catTextuel.id,
                reason: 'Création du salon tickets'
            });
            console.log("Salon tickets créé !");
            
            // Envoyer un message d'explication dans le salon ticket
            const ticketEmbed = new EmbedBuilder()
                .setColor('#00a2ff') // Bleu support
                .setTitle('🎫 𝐒𝐔𝐏𝐏𝐎𝐑𝐓 & 𝐓𝐈𝐂𝐊𝐄𝐓𝐒 ⛩️')
                .setDescription('Besoin d\'aide, d\'un rôle spécifique ou de contacter un membre du Staff ?\n\n*(Le système automatique pour ouvrir un ticket sera bientôt activé ici).*')
                .setFooter({ text: 'UXDER Support' });
                
            await ticketChannel.send({ embeds: [ticketEmbed] });
        }

        // 2. SEND COMMANDS EMBED
        const commandesChannel = channels.find(c => c.name === '🤖・commandes');
        if (commandesChannel) {
            const commandesEmbed = new EmbedBuilder()
                .setColor('#5eff00') // Vert
                .setTitle('🤖 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐔𝐓𝐈𝐋𝐄𝐒 ⛩️')
                .setDescription(`Bienvenue dans <#${commandesChannel.id}> ! C'est ici que tu peux utiliser les bots du serveur sans polluer le salon général.`)
                .addFields(
                    { name: '📊 Tes Statistiques Personnelles', value: 'Tape la commande **`/stat me`** pour voir ta carte avec ton temps de vocal et tes messages envoyés !' },
                    { name: '📈 Statistiques du Serveur', value: 'Tape **`/stat server`** pour voir l\'activité globale de UXDER.' },
                    { name: '🎫 Contacter le Staff', value: ticketChannel ? `En cas de problème, rends-toi dans le salon <#${ticketChannel.id}>.` : 'Rends-toi dans le salon tickets.' }
                )
                .setFooter({ text: 'UXDER • Espace Commandes' })
                .setTimestamp();

            await commandesChannel.send({ embeds: [commandesEmbed] });
            console.log("Embed commandes envoyé !");
        } else {
            console.log("Salon commandes introuvable.");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
