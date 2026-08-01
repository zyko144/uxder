require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        const channels = await guild.channels.fetch();

        const nitroChannel = channels.find(c => c.name === '💎・nitro');
        const decoChannel = channels.find(c => c.name === '✨・décorations');

        if (nitroChannel) {
            // Delete old messages
            const fetched = await nitroChannel.messages.fetch({ limit: 10 });
            await nitroChannel.bulkDelete(fetched).catch(() => {});

            const nitroEmbed = new EmbedBuilder()
                .setColor('#9b59b6')
                .setTitle('💎 𝐍𝐈𝐓𝐑𝐎 𝐃𝐈𝐒𝐂𝐎𝐑𝐃 ⛩️')
                .setDescription('Achète ton Nitro Discord à prix cassé ! 💸\n\n> 🔹 **1 Mois** = 4,00 €\n> 🔹 Livraison instantanée par l\'équipe\n\n**Moyen de paiement :**\nPayPal uniquement.\n\n👇 *Clique sur le bouton ci-dessous pour commander.*')
                .setImage('https://media.tenor.com/qU3g9x80Z0QAAAAi/discord-nitro.gif') // GIF Nitro fiable
                .setFooter({ text: 'UXDER Store • Achats sécurisés' });

            const nitroRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_buy').setLabel('🛒 Acheter Nitro').setStyle(ButtonStyle.Primary)
            );
            await nitroChannel.send({ embeds: [nitroEmbed], components: [nitroRow] });
        }

        if (decoChannel) {
            // Delete old messages
            const fetched = await decoChannel.messages.fetch({ limit: 10 });
            await decoChannel.bulkDelete(fetched).catch(() => {});

            const decoEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle('✨ 𝐃𝐄́𝐂𝐎𝐑𝐀𝐓𝐈𝐎𝐍𝐒 𝐃𝐄 𝐏𝐑𝐎𝐅𝐈𝐋 ⛩️')
                .setDescription('Personnalise ton profil avec nos décorations exclusives ! 🎨\n\n> 🔹 **1 Décoration** = 3,00 €\n> 🔹 Applicable directement sur ton compte\n\n**Moyen de paiement :**\nPayPal uniquement.\n\n👇 *Clique sur le bouton ci-dessous pour commander.*')
                .setImage('https://media.tenor.com/2s4P0XkC9aEAAAAi/wumpus-discord.gif') // GIF Wumpus fiable
                .setFooter({ text: 'UXDER Store • Achats sécurisés' });

            const decoRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shop_buy').setLabel('🛒 Acheter une Déco').setStyle(ButtonStyle.Primary)
            );
            await decoChannel.send({ embeds: [decoEmbed], components: [decoRow] });
        }

        console.log("✅ Salons mis à jour avec succès !");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
