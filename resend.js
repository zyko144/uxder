require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
    console.log("Bot connecté pour renvoyer tous les messages...");
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        if (!guild) {
            process.exit(1);
        }

        const channels = await guild.channels.fetch();

        const reglementChannel = channels.find(c => c.name === '📜・règlement');
        const annoncesChannel = channels.find(c => c.name === '📢・annonces');
        const bienvenueChannel = channels.find(c => c.name === '🌸・bienvenue');
        const generalChannel = channels.find(c => c.name === '💬・général');
        const ticketChannel = channels.find(c => c.name === '🎫・tickets');
        const commandesChannel = channels.find(c => c.name === '🤖・commandes');

        // 1. EMBED REGLEMENT
        if (reglementChannel) {
            const reglementEmbed = new EmbedBuilder()
                .setColor('#d82a3b')
                .setTitle('📜 𝐑𝐄̀𝐆𝐋𝐄𝐌𝐄𝐍𝐓 𝐃𝐔 𝐒𝐄𝐑𝐕𝐄𝐔𝐑 𝐔𝐗𝐃𝐄𝐑 ⛩️')
                .setDescription('Afin que tout le monde passe un bon moment, merci de respecter les règles suivantes. Tout manquement pourra être sanctionné par l\'équipe de modération.')
                .addFields(
                    { name: '🤝 1. Respect & Bienveillance', value: 'Aucune insulte, discrimination, racisme ou harcèlement ne sera toléré.' },
                    { name: '🚫 2. Pas de Spam ni de Pub', value: 'Le spam et la publicité non autorisée sont strictement interdits.' },
                    { name: '🔞 3. Contenu SFW', value: 'Pas de contenu choquant ou +18. Le serveur est ouvert à tous.' },
                    { name: '🗣️ 4. Salons appropriés', value: 'Merci d\'utiliser le bon salon pour vos discussions.' },
                    { name: '👮‍♂️ 5. Décisions du Staff', value: 'L\'équipe de modération a toujours le dernier mot. Respectez leurs décisions.' }
                )
                .setFooter({ text: 'Merci de valider votre lecture ! • UXDER' })
                .setTimestamp();
            await reglementChannel.send({ embeds: [reglementEmbed] });
            console.log("Règlement renvoyé.");
        }

        // 2. EMBED BIENVENUE
        if (bienvenueChannel) {
            const bienvenueEmbed = new EmbedBuilder()
                .setColor('#f48fb1')
                .setTitle('🌸 𝐁𝐈𝐄𝐍𝐕𝐄𝐍𝐔𝐄 𝐒𝐔𝐑 𝐔𝐗𝐃𝐄𝐑 ! 🌸')
                .setDescription('Nous sommes ravis de t\'accueillir dans notre communauté ! Installe-toi confortablement.')
                .addFields(
                    { name: '📜 Première étape', value: reglementChannel ? `N'oublie pas de lire le règlement dans <#${reglementChannel.id}>.` : 'N\'oublie pas de lire le règlement.' },
                    { name: '💬 Rejoins la discussion', value: generalChannel ? `Viens faire connaissance avec nous dans <#${generalChannel.id}> !` : 'Rejoins le salon général !' },
                    { name: '🏮 Profite bien !', value: 'Explore nos salons vocaux et textuels thématiques.' }
                )
                .setFooter({ text: 'UXDER Community' })
                .setTimestamp();
            await bienvenueChannel.send({ embeds: [bienvenueEmbed] });
            console.log("Bienvenue renvoyé.");
        }

        // 3. EMBED ANNONCES
        if (annoncesChannel) {
            const annoncesEmbed = new EmbedBuilder()
                .setColor('#ffb300')
                .setTitle('📢 𝐀𝐍𝐍𝐎𝐍𝐂𝐄𝐒 𝐎𝐅𝐅𝐈𝐂𝐈𝐄𝐋𝐋𝐄𝐒 ⛩️')
                .setDescription('C\'est ici que tu trouveras toutes les annonces importantes du serveur, les mises à jour et les événements communautaires !\n\n*N\'hésite pas à activer les notifications pour ce salon.*')
                .setFooter({ text: 'L\'équipe UXDER' })
                .setTimestamp();
            await annoncesChannel.send({ embeds: [annoncesEmbed] });
            console.log("Annonces renvoyé.");
        }

        // 4. EMBED TICKETS
        if (ticketChannel) {
            const ticketEmbed = new EmbedBuilder()
                .setColor('#00a2ff')
                .setTitle('🎫 𝐒𝐔𝐏𝐏𝐎𝐑𝐓 & 𝐓𝐈𝐂𝐊𝐄𝐓𝐒 ⛩️')
                .setDescription('Besoin d\'aide, d\'un rôle spécifique ou de contacter un membre du Staff ?\n\n*(Le système automatique pour ouvrir un ticket sera bientôt activé ici).*')
                .setFooter({ text: 'UXDER Support' });
            await ticketChannel.send({ embeds: [ticketEmbed] });
            console.log("Tickets renvoyé.");
        }

        // 5. EMBED COMMANDES
        if (commandesChannel) {
            const commandesEmbed = new EmbedBuilder()
                .setColor('#5eff00')
                .setTitle('🤖 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐔𝐓𝐈𝐋𝐄𝐒 ⛩️')
                .setDescription(`Bienvenue dans <#${commandesChannel.id}> ! C'est ici que tu peux utiliser les bots du serveur.`)
                .addFields(
                    { name: '📊 Tes Statistiques Personnelles', value: 'Tape la commande **`/stat me`** pour voir ta carte !' },
                    { name: '🎫 Contacter le Staff', value: ticketChannel ? `En cas de problème, rends-toi dans le salon <#${ticketChannel.id}>.` : 'Rends-toi dans le salon tickets.' }
                )
                .setFooter({ text: 'UXDER • Espace Commandes' })
                .setTimestamp();
            await commandesChannel.send({ embeds: [commandesEmbed] });
            console.log("Commandes renvoyé.");
        }

        console.log("Opération terminée !");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
