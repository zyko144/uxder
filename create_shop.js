require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        console.log(`🔧 Création des salons de vente sur ${guild.name}...`);

        const everyoneRole = guild.roles.everyone;
        const memberRole = guild.roles.cache.find(r => r.name.includes('Member') || r.name.includes('Membre'));

        // Créer la catégorie Boutique
        let shopCategory = guild.channels.cache.find(c => c.name === '🛒・BOUTIQUE' && c.type === ChannelType.GuildCategory);
        if (!shopCategory) {
            shopCategory = await guild.channels.create({
                name: '🛒・BOUTIQUE',
                type: ChannelType.GuildCategory,
            });
            console.log('✅ Catégorie 🛒・BOUTIQUE créée.');
        }

        const permissions = [
            { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] }
        ];
        if (memberRole) {
            permissions.push({ id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] });
        }

        // Créer salon Nitro
        const nitroChannel = await guild.channels.create({
            name: '💎・nitro',
            type: ChannelType.GuildText,
            parent: shopCategory.id,
            permissionOverwrites: permissions
        });
        console.log('✅ Salon 💎・nitro créé.');

        // Embed Nitro
        const nitroEmbed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('💎 𝐍𝐈𝐓𝐑𝐎 𝐃𝐈𝐒𝐂𝐎𝐑𝐃 ⛩️')
            .setDescription('Achète ton Nitro Discord à prix cassé ! 💸\n\n> 🔹 **1 Mois** = 4,00 €\n> 🔹 Livraison instantanée par l\'équipe\n\n**Moyens de paiement :**\nPayPal (Entre proches), Cryptomonnaies, Lydia, Paylib.\n\n👇 *Clique sur le bouton ci-dessous pour commander.*')
            .setImage('https://i.imgur.com/B942yeb.gif')
            .setFooter({ text: 'UXDER Store • Achats sécurisés' });

        const nitroRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shop_buy').setLabel('🛒 Acheter Nitro').setStyle(ButtonStyle.Primary)
        );
        await nitroChannel.send({ embeds: [nitroEmbed], components: [nitroRow] });

        // Créer salon Décorations
        const decoChannel = await guild.channels.create({
            name: '✨・décorations',
            type: ChannelType.GuildText,
            parent: shopCategory.id,
            permissionOverwrites: permissions
        });
        console.log('✅ Salon ✨・décorations créé.');

        // Embed Deco
        const decoEmbed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('✨ 𝐃𝐄́𝐂𝐎𝐑𝐀𝐓𝐈𝐎𝐍𝐒 𝐃𝐄 𝐏𝐑𝐎𝐅𝐈𝐋 ⛩️')
            .setDescription('Personnalise ton profil avec nos décorations exclusives ! 🎨\n\n> 🔹 **1 Décoration** = 3,00 €\n> 🔹 Applicable directement sur ton compte\n\n**Moyens de paiement :**\nPayPal (Entre proches), Cryptomonnaies, Lydia, Paylib.\n\n👇 *Clique sur le bouton ci-dessous pour commander.*')
            .setImage('https://i.imgur.com/Q9aZ2fT.gif') // Remplacer par un gif pertinent si besoin, ici un placeholder sympa
            .setFooter({ text: 'UXDER Store • Achats sécurisés' });

        const decoRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('shop_buy').setLabel('🛒 Acheter une Déco').setStyle(ButtonStyle.Primary)
        );
        await decoChannel.send({ embeds: [decoEmbed], components: [decoRow] });

        console.log("✅ Tous les salons de vente ont été configurés avec succès !");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);
