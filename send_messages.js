require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
    console.log(`Bot connecté pour envoyer les messages (en tant que ${client.user.tag})`);
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        if (!guild) {
            console.error("Serveur introuvable !");
            process.exit(1);
        }

        // Fetch all channels
        const channels = await guild.channels.fetch();

        // Find specific channels
        const reglementChannel = channels.find(c => c.name === '📜・règlement');
        const annoncesChannel = channels.find(c => c.name === '📢・annonces');
        const bienvenueChannel = channels.find(c => c.name === '🌸・bienvenue');
        const generalChannel = channels.find(c => c.name === '💬・général');

        // 1. EMBED REGLEMENT
        if (reglementChannel) {
            const reglementEmbed = new EmbedBuilder()
                .setColor('#d82a3b') // Rouge temple
                .setTitle('📜 𝐑𝐄̀𝐆𝐋𝐄𝐌𝐄𝐍𝐓 𝐃𝐔 𝐒𝐄𝐑𝐕𝐄𝐔𝐑 𝐔𝐗𝐃𝐄𝐑 ⛩️')
                .setDescription('Afin que tout le monde passe un bon moment, merci de respecter les règles suivantes. Tout manquement pourra être sanctionné par l\'équipe de modération.')
                .addFields(
                    { name: '🤝 1. Respect & Bienveillance', value: 'Aucune insulte, discrimination, racisme ou harcèlement ne sera toléré. Soyez courtois les uns envers les autres.' },
                    { name: '🚫 2. Pas de Spam ni de Pub', value: 'Le spam (messages, mentions, emojis) et la publicité non autorisée sont strictement interdits.' },
                    { name: '🔞 3. Contenu SFW (Safe For Work)', value: 'Pas de contenu choquant, violent ou pornographique (NSFW). Le serveur est ouvert à tous.' },
                    { name: '🗣️ 4. Salons appropriés', value: 'Merci d\'utiliser le bon salon pour vos discussions (ex: pas de commandes bot dans le général).' },
                    { name: '👮‍♂️ 5. Décisions du Staff', value: 'L\'équipe de modération a toujours le dernier mot. Respectez leurs décisions.' }
                )
                .setFooter({ text: 'Merci de valider votre lecture ! • UXDER' })
                .setTimestamp();
            
            await reglementChannel.send({ embeds: [reglementEmbed] });
            console.log("Embed Règlement envoyé !");
        } else {
            console.log("Salon règlement introuvable.");
        }

        // 2. EMBED BIENVENUE
        if (bienvenueChannel) {
            const bienvenueEmbed = new EmbedBuilder()
                .setColor('#f48fb1') // Rose Sakura
                .setTitle('🌸 𝐁𝐈𝐄𝐍𝐕𝐄𝐍𝐔𝐄 𝐒𝐔𝐑 𝐔𝐗𝐃𝐄𝐑 ! 🌸')
                .setDescription('Nous sommes ravis de t\'accueillir dans notre communauté ! Installe-toi confortablement.')
                .addFields(
                    { name: '📜 Première étape', value: reglementChannel ? `N'oublie pas de lire le règlement dans <#${reglementChannel.id}>.` : 'N\'oublie pas de lire le règlement.' },
                    { name: '💬 Rejoins la discussion', value: generalChannel ? `Viens faire connaissance avec nous dans <#${generalChannel.id}> !` : 'Rejoins le salon général !' },
                    { name: '🏮 Profite bien !', value: 'Explore nos salons vocaux et textuels thématiques.' }
                )
                .setImage('https://i.imgur.com/u5q5M2T.gif') // Un GIF sympa esthétique si possible (lien générique)
                .setFooter({ text: 'UXDER Community' })
                .setTimestamp();

            await bienvenueChannel.send({ embeds: [bienvenueEmbed] });
            console.log("Embed Bienvenue envoyé !");
        } else {
            console.log("Salon bienvenue introuvable.");
        }

        // 3. EMBED ANNONCES
        if (annoncesChannel) {
            const annoncesEmbed = new EmbedBuilder()
                .setColor('#ffb300') // Or
                .setTitle('📢 𝐀𝐍𝐍𝐎𝐍𝐂𝐄𝐒 𝐎𝐅𝐅𝐈𝐂𝐈𝐄𝐋𝐋𝐄𝐒 ⛩️')
                .setDescription('C\'est ici que tu trouveras toutes les annonces importantes du serveur, les mises à jour et les événements communautaires !\n\n*N\'hésite pas à activer les notifications pour ce salon afin de ne rien rater.*')
                .setFooter({ text: 'L\'équipe UXDER' })
                .setTimestamp();

            await annoncesChannel.send({ embeds: [annoncesEmbed] });
            console.log("Embed Annonces envoyé !");
        } else {
            console.log("Salon annonces introuvable.");
        }

        console.log("Tous les messages ont été envoyés !");
    } catch (error) {
        console.error("Erreur lors de l'envoi des messages :", error);
    }
    
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
