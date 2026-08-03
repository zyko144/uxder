require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
    {
        name: 'clear',
        description: '🗑️ Supprime des messages dans le salon',
        options: [{
            name: 'nombre',
            description: 'Nombre de messages à supprimer (1-100)',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 1,
            max_value: 100
        }]
    },
    {
        name: 'mute',
        description: '🔇 Exclure temporairement un membre',
        options: [
            { name: 'membre', description: 'Le membre à exclure', type: ApplicationCommandOptionType.User, required: true },
            { name: 'duree', description: 'Durée en minutes (1-40320)', type: ApplicationCommandOptionType.Integer, required: true, min_value: 1, max_value: 40320 },
            { name: 'raison', description: 'Raison de l\'exclusion', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'unmute',
        description: '🔊 Lever l\'exclusion d\'un membre',
        options: [
            { name: 'membre', description: 'Le membre à démuter', type: ApplicationCommandOptionType.User, required: true }
        ]
    },
    {
        name: 'kick',
        description: '👢 Expulser un membre du serveur',
        options: [
            { name: 'membre', description: 'Le membre à expulser', type: ApplicationCommandOptionType.User, required: true },
            { name: 'raison', description: 'Raison de l\'expulsion', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'ban',
        description: '🔨 Bannir un membre du serveur',
        options: [
            { name: 'membre', description: 'Le membre à bannir', type: ApplicationCommandOptionType.User, required: true },
            { name: 'raison', description: 'Raison du ban', type: ApplicationCommandOptionType.String, required: false },
            { name: 'supprimer_messages', description: 'Supprimer les messages des X derniers jours (0-7)', type: ApplicationCommandOptionType.Integer, required: false, min_value: 0, max_value: 7 }
        ]
    },
    {
        name: 'unban',
        description: '✅ Débannir un utilisateur par son ID',
        options: [
            { name: 'user_id', description: 'L\'ID de l\'utilisateur à débannir', type: ApplicationCommandOptionType.String, required: true }
        ]
    },
    {
        name: 'warn',
        description: '⚠️ Avertir un membre',
        options: [
            { name: 'membre', description: 'Le membre à avertir', type: ApplicationCommandOptionType.User, required: true },
            { name: 'raison', description: 'Raison de l\'avertissement', type: ApplicationCommandOptionType.String, required: true }
        ]
    },
    {
        name: 'warns',
        description: '📋 Voir les avertissements d\'un membre',
        options: [
            { name: 'membre', description: 'Le membre à vérifier', type: ApplicationCommandOptionType.User, required: true }
        ]
    },
    {
        name: 'slowmode',
        description: '🐢 Définir le mode lent dans ce salon',
        options: [
            { name: 'secondes', description: 'Délai en secondes (0 = désactiver)', type: ApplicationCommandOptionType.Integer, required: true, min_value: 0, max_value: 21600 }
        ]
    },
    {
        name: 'lock',
        description: '🔒 Verrouiller ce salon (personne ne peut écrire)',
        options: [
            { name: 'raison', description: 'Raison du verrouillage', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'unlock',
        description: '🔓 Déverrouiller ce salon',
        options: []
    },
    {
        name: 'userinfo',
        description: '🔍 Voir les infos d\'un membre',
        options: [
            { name: 'membre', description: 'Le membre à inspecter', type: ApplicationCommandOptionType.User, required: false }
        ]
    },
    {
        name: 'serverinfo',
        description: '📊 Informations sur le serveur UXDER',
        options: []
    },
    {
        name: 'say',
        description: '📢 Faire dire un message au bot (Staff seulement)',
        options: [
            { name: 'message', description: 'Le message à envoyer', type: ApplicationCommandOptionType.String, required: true }
        ]
    },
    {
        name: 'giveaway',
        description: '🎉 Lancer un giveaway dans #giveaways',
        options: [
            { name: 'lot', description: 'Ce que l\'on fait gagner', type: ApplicationCommandOptionType.String, required: true },
            { name: 'duree', description: 'Durée en minutes', type: ApplicationCommandOptionType.Integer, required: true, min_value: 1 },
            { name: 'gagnants', description: 'Nombre de gagnants', type: ApplicationCommandOptionType.Integer, required: false, min_value: 1, max_value: 10 },
            { name: 'condition', description: 'Condition pour participer (ex: Avoir le rôle Nitro)', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'setup_shop',
        description: '🛒 Envoyer le panel de la boutique UXDER (Admin)',
        options: []
    },
    {
        name: 'setup_verify',
        description: '✅ Envoyer le panel de vérification dans #bienvenue (Admin)',
        options: []
    },

    // ── MUSIQUE ──────────────────────────────────────────────────────────────────
    {
        name: 'play',
        description: '🎵 Jouer une musique (YouTube, Spotify, SoundCloud, lien playlist...)',
        options: [
            {
                name: 'query',
                description: 'Titre, artiste ou lien (YouTube / Spotify / SoundCloud)',
                type: 3, // STRING
                required: true
            }
        ]
    },
    {
        name: 'skip',
        description: '⏭️ Passer à la musique suivante',
        options: []
    },
    {
        name: 'stop',
        description: '⏹️ Arrêter la musique et quitter le salon vocal',
        options: []
    },
    {
        name: 'pause',
        description: '⏸️ Mettre en pause la musique',
        options: []
    },
    {
        name: 'resume',
        description: '▶️ Reprendre la musique',
        options: []
    },
    {
        name: 'queue',
        description: '📋 Voir la file d\'attente',
        options: []
    },
    {
        name: 'nowplaying',
        description: '🎶 Voir la musique en cours de lecture',
        options: []
    },
    {
        name: 'volume',
        description: '🔊 Régler le volume (0-100)',
        options: [
            {
                name: 'niveau',
                description: 'Volume entre 0 et 100',
                type: 4, // INTEGER
                required: true,
                min_value: 0,
                max_value: 100
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`🔄 Enregistrement de ${commands.length} slash commands...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log(`✅ ${commands.length} commandes enregistrées avec succès !`);
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement :', error);
    }
})();
