require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();

    const chatStaff = channels.find(c => c.name === '💬・chat-staff');
    if (!chatStaff) { console.log('Salon chat-staff introuvable'); process.exit(1); }

    const embed1 = new EmbedBuilder()
        .setColor('#d82a3b')
        .setTitle('🛡️ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐄𝐒 𝐌𝐎𝐃𝐄́𝐑𝐀𝐓𝐈𝐎𝐍 ⛩️')
        .setDescription('Liste complète des commandes disponibles pour le Staff UXDER.')
        .addFields(
            {
                name: '⚠️ Sanctions',
                value: [
                    '`/warn @membre raison` — Avertir un membre (DM + log)',
                    '`/warns @membre` — Voir les avertissements d\'un membre',
                    '`/mute @membre durée raison` — Exclure temporairement (timeout Discord)',
                    '`/unmute @membre` — Lever l\'exclusion immédiatement',
                    '`/kick @membre raison` — Expulser du serveur (DM envoyé)',
                    '`/ban @membre raison` — Bannir du serveur (DM envoyé)',
                    '`/unban [ID]` — Débannir un utilisateur par son ID',
                ].join('\n')
            },
            {
                name: '🔧 Gestion des Salons',
                value: [
                    '`/clear [1-100]` — Supprimer X messages dans le salon',
                    '`/slowmode [secondes]` — Activer le mode lent (0 = désactiver)',
                    '`/lock [raison]` — Verrouiller un salon (plus personne n\'écrit)',
                    '`/unlock` — Déverrouiller un salon',
                ].join('\n')
            },
            {
                name: '📊 Informations',
                value: [
                    '`/userinfo @membre` — Fiche complète d\'un membre',
                    '`/serverinfo` — Statistiques du serveur UXDER',
                    '`/say [message]` — Faire parler le bot dans un salon',
                ].join('\n')
            },
            {
                name: '🎫 Tickets (Commandes Admin)',
                value: [
                    '`!setup_ticket` — Générer le panel de tickets (Admin seulement)',
                ].join('\n')
            }
        )
        .setFooter({ text: 'UXDER • Espace Staff — Réservé au Staff uniquement' })
        .setTimestamp();

    const embed2 = new EmbedBuilder()
        .setColor('#00a2ff')
        .setTitle('🤖 𝐀𝐔𝐓𝐎𝐌𝐀𝐓𝐈𝐒𝐌𝐄𝐒 𝐀𝐂𝐓𝐈𝐅𝐒 ⛩️')
        .setDescription('Ces protections fonctionnent **automatiquement**, 24h/24 sans intervention.')
        .addFields(
            {
                name: '🔗 Anti-Pub',
                value: 'Supprime automatiquement tout lien `discord.gg/...` envoyé par un non-staff. Le membre est averti et l\'action est loguée dans `📜・logs-serveur`.'
            },
            {
                name: '⚡ Anti-Spam',
                value: 'Si un membre envoie **6 messages ou plus en 5 secondes**, le bot supprime les messages et applique une **exclusion automatique de 10 minutes** (timeout natif Discord). Il reçoit un DM d\'explication.'
            },
            {
                name: '📜 Logs automatiques',
                value: [
                    '**`📜・logs-serveur`** reçoit :',
                    '→ Messages supprimés (avec contenu)',
                    '→ Messages modifiés (avant / après)',
                    '→ Membres qui quittent le serveur',
                    '→ Bans (avec modérateur & raison via audit log)',
                    '→ Anti-pub & Anti-spam détectés',
                ].join('\n')
            },
            {
                name: '⚠️ Sanctions Staff',
                value: '**`⚠️・sanctions`** reçoit tous les `/warn`, `/mute`, `/kick`, `/ban` et `/unban` effectués par le Staff.'
            }
        )
        .setFooter({ text: 'UXDER • Modération Auto' })
        .setTimestamp();

    await chatStaff.send({ embeds: [embed1] });
    await chatStaff.send({ embeds: [embed2] });

    console.log('✅ Messages envoyés dans #chat-staff !');
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
