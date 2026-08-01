require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

const GUILD_ID = process.env.GUILD_ID;

client.once('ready', async () => {
    console.log(`Bot connecté pour créer les rôles (en tant que ${client.user.tag})`);
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        if (!guild) {
            console.error("Serveur introuvable !");
            process.exit(1);
        }

        console.log(`Création des rôles pour le serveur : ${guild.name}`);

        // Définition des rôles dans l'ordre de création (du plus bas au plus haut)
        // car Discord place les nouveaux rôles au-dessus du rôle par défaut.
        // Pour avoir Owner en haut, on le crée en dernier.
        const rolesToCreate = [
            {
                name: '🤖・Bot',
                color: '#8c8c8c',
                permissions: [],
            },
            {
                name: '🔇・Muted',
                color: '#363636',
                permissions: [], // Les permissions restrictives se font au niveau des salons généralement, mais par sécurité on ne met rien ici.
            },
            {
                name: '👤・Member',
                color: '#5eff00',
                permissions: [],
            },
            {
                name: '🌸・Active',
                color: '#ffb3d9',
                permissions: [],
            },
            {
                name: '🌟・MVP',
                color: '#ffea00',
                permissions: [],
            },
            {
                name: '💎・VIP',
                color: '#8c00ff',
                permissions: [],
            },
            {
                name: '🚀・Server Booster',
                color: '#f47fff',
                permissions: [],
            },
            {
                name: '🎟️・Helper',
                color: '#00a2ff',
                permissions: [
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.KickMembers,
                    PermissionsBitField.Flags.MuteMembers
                ],
            },
            {
                name: '🛡️・Moderator',
                color: '#ff6a00',
                permissions: [
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.KickMembers,
                    PermissionsBitField.Flags.BanMembers,
                    PermissionsBitField.Flags.MuteMembers,
                    PermissionsBitField.Flags.DeafenMembers,
                    PermissionsBitField.Flags.ManageNicknames
                ],
            },
            {
                name: '🛠️・Manager',
                color: '#ff0000',
                permissions: [
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.KickMembers,
                    PermissionsBitField.Flags.BanMembers,
                    PermissionsBitField.Flags.MuteMembers,
                    PermissionsBitField.Flags.DeafenMembers,
                    PermissionsBitField.Flags.ManageNicknames,
                    PermissionsBitField.Flags.ManageRoles,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ViewAuditLog
                ],
            },
            {
                name: '👑・Owner',
                color: '#FFD700',
                permissions: [PermissionsBitField.Flags.Administrator],
                hoist: true // Afficher séparément
            }
        ];

        // Création des rôles
        for (const roleData of rolesToCreate) {
            await guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                permissions: roleData.permissions,
                hoist: true, // Afficher les membres ayant ce rôle séparément
                reason: 'Configuration des rôles UXDER',
            });
            console.log(`Rôle créé : ${roleData.name}`);
        }

        console.log("Tous les rôles ont été créés avec succès !");

    } catch (error) {
        console.error("Erreur lors de la création des rôles :", error);
    }
    
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
