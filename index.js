require('dotenv').config();
const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder, AuditLogEvent, MessageFlags
} = require('discord.js');
const { Player } = require('discord-player');
const ffmpegStatic = require('ffmpeg-static');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Forcer le path ffmpeg pour Render
process.env.FFMPEG_PATH = ffmpegStatic;

// ─── SERVEUR WEB (Pour Render) ───────────────────────────────────────────────────────────────
const app = express();
app.get('/', (req, res) => res.send('UXDER Bot est en ligne H24 ! 🚀'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Serveur Web démarré sur le port ${PORT} (Render OK)`));

// ─── BASE DE DONNÉES ────────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ─── DISCORD PLAYER ───────────────────────────────────────────────────────────
const player = new Player(client);

(async () => {
    const { DefaultExtractors } = require('@discord-player/extractor');
    const { YoutubeiExtractor } = require('discord-player-youtubei');
    
    // 1. Enregistrer Youtubei pour bypasser les restrictions et trouver les liens YT
    await player.extractors.register(YoutubeiExtractor, {
        streamOptions: {
            useClient: 'ANDROID' // Bypass throttling
        }
    });

    // 2. Charger les autres (Spotify, SoundCloud...) en utilisant Youtubei comme pont
    await player.extractors.loadMulti(DefaultExtractors, {
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            bridgeProvider: new YoutubeiExtractor()
        }
    });
    
    console.log('✅ Extractors musicaux chargés : YouTubei | Spotify | SoundCloud');
})();

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const STAFF_ROLES = ['1532894464996016248', '1532894464123867197', '1532894463263899798']; // Owner, Manager, Mod
const MEMBER_ROLE_ID = '1532894458469679204'; // 👤・Member
const LOGS_CHANNEL_NAME = '📜・logs-serveur';
const SANCTIONS_CHANNEL_NAME = '⚠️・sanctions';
const BIENVENUE_CHANNEL_NAME = '🌸・bienvenue';
const GIVEAWAYS_CHANNEL_NAME = '🎉・giveaways';
const activeTicketCreations = new Set();
const spamMap = new Map();
const activeGiveaways = new Map(); // messageId => { lot, winners, endsAt, participants }

// Anti-raid
const recentJoins = [];
const RAID_THRESHOLD = 5;   // membres
const RAID_WINDOW_MS = 10000; // 10 secondes
let raidLocked = false;

// Liens Discord externes interdits (pub)
const LINK_REGEX = /discord\.gg\/[a-zA-Z0-9]+|discord\.com\/invite\/[a-zA-Z0-9]+/i;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isStaffMember(member) {
    return STAFF_ROLES.some(roleId => member.roles.cache.has(roleId));
}

async function getLogsChannel(guild, name) {
    return guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildText);
}

// ─── READY ────────────────────────────────────────────────────────────────────
client.once('ready', () => {
    console.log(`🚀 UXDER Bot en ligne : ${client.user.tag}`);
    console.log(`🛡️  Modules actifs : Anti-lien | Anti-spam | Anti-raid | Bienvenue | Giveaways | Vérification | Musique`);
});

// ─── PLAYER EVENTS ────────────────────────────────────────────────────────────
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send({ embeds: [
        new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('🎵 En cours de lecture')
            .setDescription(`### [${track.title}](${track.url})`)
            .addFields(
                { name: '👤 Artiste', value: track.author || 'Inconnu', inline: true },
                { name: '⏱️ Durée', value: track.duration || '?', inline: true },
                { name: '🔗 Source', value: track.source || 'YouTube', inline: true }
            )
            .setThumbnail(track.thumbnail)
            .setFooter({ text: `Demandé par ${track.requestedBy?.username || 'quelqu\'un'}` })
    ]}).catch(() => {});
});

player.events.on('emptyQueue', (queue) => {
    queue.metadata.channel.send('✅ File d\'attente terminée ! Plus de musiques à jouer.').catch(() => {});
});

player.events.on('playerError', (queue, error) => {
    console.error('Erreur player:', error);
    queue.metadata.channel.send('❌ Erreur lors de la lecture. On passe à la suivante !').catch(() => {});
});

// Forcer selfDeaf=false dès que le bot rejoint un vocal (fix sourdine)
player.events.on('connection', (queue) => {
    const voiceConnection = queue.connection;
    if (voiceConnection && voiceConnection.joinConfig) {
        voiceConnection.joinConfig.selfDeaf = false;
    }
    // Force via guild voice state
    queue.guild.members.me?.voice?.setDeaf(false).catch(() => {});
    queue.guild.members.me?.voice?.setMute(false).catch(() => {});
});

// Gestionnaire d'erreur global
client.on('error', (err) => { console.error('❌ Erreur Discord Client:', err.message); });
process.on('unhandledRejection', (reason) => { console.error('❌ Unhandled Rejection:', reason?.message || reason); });

// ─── BIENVENUE AUTOMATIQUE + ANTI-RAID ────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
    const guild = member.guild;
    const now = Date.now();

    // ── Anti-raid ──────────────────────────────────────────────────────────────
    recentJoins.push(now);
    // Purge les anciennes entrées hors fenêtre
    while (recentJoins.length > 0 && recentJoins[0] < now - RAID_WINDOW_MS) recentJoins.shift();

    if (!raidLocked && recentJoins.length >= RAID_THRESHOLD) {
        raidLocked = true;
        console.warn('🚨 RAID DÉTECTÉ — Verrouillage du serveur !');

        // Verrouiller tous les salons publics
        const textChannels = guild.channels.cache.filter(c =>
            c.type === ChannelType.GuildText &&
            !['📜・logs-serveur','⚠️・sanctions','💬・chat-staff'].includes(c.name)
        );
        for (const [, ch] of textChannels) {
            await ch.permissionOverwrites.edit(guild.id, { SendMessages: false }).catch(() => {});
        }

        const logsChannel = await getLogsChannel(guild, LOGS_CHANNEL_NAME);
        if (logsChannel) {
            await logsChannel.send({ embeds: [new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🚨 RAID DÉTECTÉ — SERVEUR VERROUILLÉ')
                .setDescription(`**${recentJoins.length} membres** ont rejoint en moins de 10 secondes !\n\nTous les salons ont été verrouillés automatiquement.\n\nUtilise \`/unlock\` dans chaque salon pour déverrouiller manuellement.`)
                .setTimestamp()] });
        }

        // Déverrouillage automatique après 5 minutes
        setTimeout(async () => {
            for (const [, ch] of textChannels) {
                await ch.permissionOverwrites.edit(guild.id, { SendMessages: null }).catch(() => {});
            }
            raidLocked = false;
            if (logsChannel) await logsChannel.send({ embeds: [new EmbedBuilder()
                .setColor('#2ecc71')
                .setDescription('✅ Serveur déverrouillé automatiquement après 5 minutes.')
                .setTimestamp()] });
        }, 5 * 60 * 1000);
    }

    // ── Bienvenue dans le salon ─────────────────────────────────────────────────
    const bienvenueChannel = guild.channels.cache.find(c => c.name === BIENVENUE_CHANNEL_NAME);
    if (bienvenueChannel) {
        const embed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle(`👋 Bienvenue sur UXDER, ${member.user.username} !`)
            .setDescription([
                `# Bienvenue <@${member.id}> ! 🎉`,
                ``,
                `> 📜 Lis bien les règles du serveur`,
                `> 💬 Présente-toi dans le bon salon`,
                `> 🎁 Profite de tous nos salons !`,
            ].join('\n'))
            .addFields(
                { name: '👥 Membre', value: `**#${guild.memberCount}**`, inline: true },
                { name: '📅 Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'UXDER Community • Bienvenue parmi nous !' })
            .setTimestamp();

        await bienvenueChannel.send({ content: `<@${member.id}>`, embeds: [embed] }).catch(() => {});
    }

    // Rôle membre automatique
    await member.roles.add(MEMBER_ROLE_ID).catch(() => {});
});


// ─── COMMANDES TEXTE (Admin seulement) ────────────────────────────────────────
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
    const isMod = isStaffMember(message.member);

    // ── !setup_ticket ──────────────────────────────────────────────────────────
    if (message.content === '!setup_ticket' && isAdmin) {
        const embed = new EmbedBuilder()
            .setColor('#00a2ff')
            .setTitle('🎫 𝐂𝐎𝐍𝐓𝐀𝐂𝐓𝐄𝐑 𝐋𝐄 𝐒𝐓𝐀𝐅𝐅 ⛩️')
            .setDescription('Si tu as une question, un problème ou une envie de faire des achats, sélectionne la catégorie correspondante dans le menu ci-dessous pour ouvrir un salon privé avec notre équipe !')
            .setFooter({ text: 'Support UXDER' });
            
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Sélectionne le motif de ton ticket...')
            .addOptions([
                { label: '🛒 Achat / Boutique', description: 'Pour acheter un produit ou service', value: 'buy' },
                { label: '🤝 Partenariat', description: 'Pour toute demande de publicité / alliance', value: 'partner' },
                { label: '🆘 Support / Autre', description: 'Besoin d\'aide ou questions générales', value: 'support' }
            ]);

        await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
        await message.delete().catch(() => {});
    }

    // ── !warn @user raison ─────────────────────────────────────────────────────
    if (message.content.startsWith('!warn') && isMod) {
        const args = message.content.split(' ');
        const targetMember = message.mentions.members.first();
        const reason = args.slice(2).join(' ') || 'Aucune raison précisée';

        if (!targetMember) return message.reply('❌ Mentionne un membre à avertir : `!warn @membre raison`');

        const { error } = await supabase.from('warns').insert([{
            user_id: targetMember.id,
            moderator_id: message.author.id,
            reason: reason,
            guild_id: message.guild.id
        }]);
        if (error) console.error("Supabase warn error:", error.message);

        try {
            await targetMember.send({
                embeds: [new EmbedBuilder()
                    .setColor('#ff6b35')
                    .setTitle('⚠️ Tu as reçu un avertissement sur UXDER')
                    .setDescription(`**Raison :** ${reason}\n\n*En cas de récidive, des sanctions plus lourdes pourront être appliquées.*`)
                    .setFooter({ text: 'UXDER • Modération' })
                    .setTimestamp()]
            });
        } catch (e) {}

        const sanctionsChannel = await getLogsChannel(message.guild, SANCTIONS_CHANNEL_NAME);
        if (sanctionsChannel) {
            await sanctionsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#ff6b35')
                    .setTitle('⚠️ Avertissement')
                    .addFields(
                        { name: 'Membre', value: `<@${targetMember.id}> (${targetMember.user.tag})`, inline: true },
                        { name: 'Modérateur', value: `<@${message.author.id}>`, inline: true },
                        { name: 'Raison', value: reason }
                    )
                    .setTimestamp()]
            });
        }

        await message.reply({ embeds: [new EmbedBuilder().setColor('#ff6b35').setDescription(`✅ <@${targetMember.id}> a été averti. Raison : **${reason}**`)] });
    }

    // ── !mute @user raison ─────────────────────────────────────────────────────
    if (message.content.startsWith('!mute') && isMod) {
        const targetMember = message.mentions.members.first();
        const reason = message.content.split(' ').slice(2).join(' ') || 'Aucune raison précisée';
        if (!targetMember) return message.reply('❌ Mentionne un membre : `!mute @membre raison`');

        const mutedRole = message.guild.roles.cache.find(r => r.name === '🔇・Muted');
        if (!mutedRole) return message.reply('❌ Le rôle `🔇・Muted` est introuvable.');

        await targetMember.roles.add(mutedRole).catch(() => {});

        const sanctionsChannel = await getLogsChannel(message.guild, SANCTIONS_CHANNEL_NAME);
        if (sanctionsChannel) {
            await sanctionsChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#c0392b')
                    .setTitle('🔇 Membre Muté')
                    .addFields(
                        { name: 'Membre', value: `<@${targetMember.id}> (${targetMember.user.tag})`, inline: true },
                        { name: 'Modérateur', value: `<@${message.author.id}>`, inline: true },
                        { name: 'Raison', value: reason }
                    )
                    .setTimestamp()]
            });
        }
        await message.reply({ embeds: [new EmbedBuilder().setColor('#c0392b').setDescription(`🔇 <@${targetMember.id}> a été réduit au silence. Raison : **${reason}**`)] });
    }

    // ── !unmute @user ──────────────────────────────────────────────────────────
    if (message.content.startsWith('!unmute') && isMod) {
        const targetMember = message.mentions.members.first();
        if (!targetMember) return message.reply('❌ Mentionne un membre : `!unmute @membre`');
        const mutedRole = message.guild.roles.cache.find(r => r.name === '🔇・Muted');
        if (mutedRole) await targetMember.roles.remove(mutedRole).catch(() => {});
        await message.reply({ embeds: [new EmbedBuilder().setColor('#2ecc71').setDescription(`🔊 <@${targetMember.id}> peut à nouveau parler.`)] });
    }

    // ─────────────── ANTI-LIEN / ANTI-PUB ─────────────────────────────────────
    const isPartnerChannel = message.channel.name && (
        message.channel.name.includes('partenariat') ||
        message.channel.name.includes('partenaire') ||
        message.channel.name.includes('partner') ||
        message.channel.name.includes('pub')
    );

    if (!isMod && !isPartnerChannel && LINK_REGEX.test(message.content)) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send({ embeds: [new EmbedBuilder()
            .setColor('#e74c3c')
            .setDescription(`🚫 <@${message.author.id}>, la publicité et les liens Discord sont interdits sur UXDER.`)] });
        setTimeout(() => warn.delete().catch(() => {}), 5000);

        const logsChannel = await getLogsChannel(message.guild, LOGS_CHANNEL_NAME);
        if (logsChannel) {
            await logsChannel.send({ embeds: [new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🔗 Lien supprimé (Anti-pub)')
                .addFields(
                    { name: 'Auteur', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                    { name: 'Salon', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'Contenu', value: `\`\`\`${message.content.substring(0, 500)}\`\`\`` }
                )
                .setTimestamp()] });
        }
        return;
    }

    // ─────────────── ANTI-SPAM ─────────────────────────────────────────────────
    if (!isMod) {
        const userId = message.author.id;
        if (!spamMap.has(userId)) {
            spamMap.set(userId, { count: 1, timer: setTimeout(() => spamMap.delete(userId), 5000) });
        } else {
            const data = spamMap.get(userId);
            data.count++;

            if (data.count >= 6) {
                clearTimeout(data.timer);
                spamMap.delete(userId);
                
                const msgs = await message.channel.messages.fetch({ limit: 10 });
                const spamMsgs = msgs.filter(m => m.author.id === userId);
                await message.channel.bulkDelete(spamMsgs).catch(() => {});

                const MUTE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

                // Vraie exclusion temporaire Discord (timeout natif)
                await message.member.timeout(MUTE_DURATION_MS, 'Spam automatique').catch(() => {});

                // Message dans le salon
                const warn = await message.channel.send({ embeds: [new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setDescription(`⚡ <@${message.author.id}> a été exclu temporairement **10 minutes** pour spam abusif.`)] });
                setTimeout(() => warn.delete().catch(() => {}), 8000);

                // Notif DM immédiate
                await message.member.send({ embeds: [new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('⚡ Exclusion temporaire — Spam')
                    .setDescription('Tu as reçu une **exclusion temporaire de 10 minutes** sur **UXDER** pour spam abusif.\n\n> Tu ne pourras pas envoyer de messages ni rejoindre de salons vocaux pendant cette durée.\n\nEn cas de récidive, la sanction sera plus longue.')
                    .setFooter({ text: 'UXDER • Modération Auto' })
                    .setTimestamp()]
                }).catch(() => {});

                const logsChannel = await getLogsChannel(message.guild, LOGS_CHANNEL_NAME);
                if (logsChannel) {
                    await logsChannel.send({ embeds: [new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle('⚡ Spam détecté — Exclusion 10 min')
                        .addFields(
                            { name: 'Membre', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                            { name: 'Salon', value: `<#${message.channel.id}>`, inline: true },
                            { name: 'Durée', value: '10 minutes (timeout natif)', inline: true }
                        )
                        .setTimestamp()] });
                }
            }
        }
    }
});

// ─── LOG : MESSAGE SUPPRIMÉ ────────────────────────────────────────────────────
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const logsChannel = await getLogsChannel(message.guild, LOGS_CHANNEL_NAME);
    if (!logsChannel) return;

    await logsChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🗑️ Message Supprimé')
        .addFields(
            { name: 'Auteur', value: message.author ? `<@${message.author.id}> (${message.author.tag})` : 'Inconnu', inline: true },
            { name: 'Salon', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Contenu', value: message.content ? `\`\`\`${message.content.substring(0, 900)}\`\`\`` : '*Contenu inconnu (image/embed)*' }
        )
        .setTimestamp()] });
});

// ─── LOG : MESSAGE MODIFIÉ ─────────────────────────────────────────────────────
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot || oldMsg.content === newMsg.content) return;
    const logsChannel = await getLogsChannel(newMsg.guild, LOGS_CHANNEL_NAME);
    if (!logsChannel) return;

    await logsChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('✏️ Message Modifié')
        .setURL(newMsg.url)
        .addFields(
            { name: 'Auteur', value: `<@${newMsg.author.id}> (${newMsg.author.tag})`, inline: true },
            { name: 'Salon', value: `<#${newMsg.channel.id}>`, inline: true },
            { name: '🔴 Avant', value: oldMsg.content ? `\`\`\`${oldMsg.content.substring(0, 450)}\`\`\`` : '*Inconnu*' },
            { name: '🟢 Après', value: newMsg.content ? `\`\`\`${newMsg.content.substring(0, 450)}\`\`\`` : '*Inconnu*' }
        )
        .setTimestamp()] });
});

// ─── LOG : MEMBRE QUITTE ───────────────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
    const logsChannel = await getLogsChannel(member.guild, LOGS_CHANNEL_NAME);
    if (!logsChannel) return;

    const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'Aucun';
    await logsChannel.send({ embeds: [new EmbedBuilder()
        .setColor('#95a5a6')
        .setTitle('👋 Membre Parti')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'Membre', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
            { name: 'Arrivé le', value: member.joinedAt ? member.joinedAt.toLocaleDateString('fr-FR') : 'Inconnu', inline: true },
            { name: 'Rôles', value: roles }
        )
        .setTimestamp()] });
});

// ─── LOG : MEMBRE BAN / KICK ───────────────────────────────────────────────────
client.on('guildBanAdd', async (ban) => {
    const logsChannel = await getLogsChannel(ban.guild, LOGS_CHANNEL_NAME);
    const sanctionsChannel = await getLogsChannel(ban.guild, SANCTIONS_CHANNEL_NAME);
    const target = sanctionsChannel || logsChannel;
    if (!target) return;

    setTimeout(async () => {
        let reason = ban.reason || 'Aucune raison';
        let mod = 'Inconnu';
        try {
            const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
            const entry = auditLogs.entries.first();
            if (entry) { reason = entry.reason || reason; mod = entry.executor?.tag || mod; }
        } catch (e) {}

        await target.send({ embeds: [new EmbedBuilder()
            .setColor('#c0392b')
            .setTitle('🔨 Membre Banni')
            .addFields(
                { name: 'Membre', value: `${ban.user.tag} (<@${ban.user.id}>)`, inline: true },
                { name: 'Modérateur', value: mod, inline: true },
                { name: 'Raison', value: reason }
            )
            .setTimestamp()] });
    }, 1000);
});

// ─── SLASH COMMANDS ───────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, member, guild } = interaction;
    const isMod = isStaffMember(member) || member.permissions.has(PermissionFlagsBits.ManageMessages);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    // ─── LOG AUTO DE TOUTES LES COMMANDES SLASH ─────────────────────────────
    const logsChannel = await getLogsChannel(guild, LOGS_CHANNEL_NAME);
    if (logsChannel) {
        // Récupérer les options utilisées (ex: lot:Nitro duree:10)
        const optionsStr = interaction.options?.data?.length > 0
            ? interaction.options.data.map(o => `\`${o.name}: ${o.value}\``).join(' ')
            : '*Aucune option*';

        // Couleur spéciale pour /say (commande sensible)
        const isSensitive = ['say', 'ban', 'kick', 'mute', 'warn', 'unban', 'unmute'].includes(commandName);

        await logsChannel.send({ embeds: [new EmbedBuilder()
            .setColor(isSensitive ? '#e74c3c' : '#5865f2')
            .setTitle(`${isSensitive ? '⚠️' : '🔧'} Commande utilisée : /${commandName}`)
            .addFields(
                { name: '👤 Utilisateur', value: `<@${member.id}> (${member.user.tag})`, inline: true },
                { name: '📍 Salon', value: `<#${interaction.channel.id}>`, inline: true },
                { name: '⚙️ Options', value: optionsStr, inline: false }
            )
            .setFooter({ text: `ID: ${member.id}` })
            .setTimestamp()
        ]}).catch(() => {});
    }


    // Helper : log une sanction dans #sanctions
    async function logSanction(title, color, fields) {
        const sanctionsChannel = await getLogsChannel(guild, SANCTIONS_CHANNEL_NAME);
        if (sanctionsChannel) {
            await sanctionsChannel.send({ embeds: [new EmbedBuilder()
                .setColor(color).setTitle(title)
                .addFields(...fields)
                .setTimestamp()] });
        }
    }

    // ── /clear ─────────────────────────────────────────────────────────────────
    if (commandName === 'clear') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const nombre = interaction.options.getInteger('nombre');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const deleted = await interaction.channel.bulkDelete(nombre, true).catch(() => null);
        const count = deleted ? deleted.size : 0;
        await interaction.editReply({ content: `✅ **${count}** message(s) supprimé(s).` });
        await logSanction('🗑️ Clear', '#e67e22', [
            { name: 'Modérateur', value: `<@${member.id}>`, inline: true },
            { name: 'Salon', value: `<#${interaction.channel.id}>`, inline: true },
            { name: 'Quantité', value: `${count} messages`, inline: true }
        ]);
    }

    // ── /mute ──────────────────────────────────────────────────────────────────
    if (commandName === 'mute') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const target = interaction.options.getMember('membre');
        const duree = interaction.options.getInteger('duree');
        const raison = interaction.options.getString('raison') || 'Aucune raison précisée';
        if (isStaffMember(target)) return interaction.reply({ content: '❌ Tu ne peux pas exclure un membre du Staff.', flags: MessageFlags.Ephemeral });
        await target.timeout(duree * 60 * 1000, raison).catch(() => {});
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#c0392b')
            .setDescription(`🔇 <@${target.id}> a été exclu temporairement **${duree} minute(s)**.\n**Raison :** ${raison}`)] });
        await target.send({ embeds: [new EmbedBuilder().setColor('#c0392b')
            .setTitle('🔇 Exclusion temporaire — UXDER')
            .setDescription(`Tu as été exclu temporairement pour **${duree} minute(s)**.\n**Raison :** ${raison}`)
            .setFooter({ text: 'UXDER • Modération' }).setTimestamp()] }).catch(() => {});
        await logSanction('🔇 Mute', '#c0392b', [
            { name: 'Membre', value: `<@${target.id}> (${target.user.tag})`, inline: true },
            { name: 'Modérateur', value: `<@${member.id}>`, inline: true },
            { name: 'Durée', value: `${duree} min`, inline: true },
            { name: 'Raison', value: raison }
        ]);
    }

    // ── /unmute ────────────────────────────────────────────────────────────────
    if (commandName === 'unmute') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const target = interaction.options.getMember('membre');
        await target.timeout(null).catch(() => {});
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#2ecc71')
            .setDescription(`🔊 L'exclusion de <@${target.id}> a été levée.`)] });
        await logSanction('🔊 Unmute', '#2ecc71', [
            { name: 'Membre', value: `<@${target.id}> (${target.user.tag})`, inline: true },
            { name: 'Modérateur', value: `<@${member.id}>`, inline: true }
        ]);
    }

    // ── /kick ──────────────────────────────────────────────────────────────────
    if (commandName === 'kick') {
        if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const target = interaction.options.getMember('membre');
        const raison = interaction.options.getString('raison') || 'Aucune raison précisée';
        if (isStaffMember(target)) return interaction.reply({ content: '❌ Tu ne peux pas expulser un Staff.', flags: MessageFlags.Ephemeral });
        await target.send({ embeds: [new EmbedBuilder().setColor('#e67e22')
            .setTitle('👢 Tu as été expulsé de UXDER')
            .setDescription(`**Raison :** ${raison}`)
            .setFooter({ text: 'UXDER • Modération' }).setTimestamp()] }).catch(() => {});
        await target.kick(raison).catch(() => {});
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#e67e22')
            .setDescription(`👢 <@${target.id}> a été expulsé du serveur.\n**Raison :** ${raison}`)] });
        await logSanction('👢 Kick', '#e67e22', [
            { name: 'Membre', value: `${target.user.tag}`, inline: true },
            { name: 'Modérateur', value: `<@${member.id}>`, inline: true },
            { name: 'Raison', value: raison }
        ]);
    }

    // ── /ban ───────────────────────────────────────────────────────────────────
    if (commandName === 'ban') {
        if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const target = interaction.options.getMember('membre');
        const raison = interaction.options.getString('raison') || 'Aucune raison précisée';
        const deletedays = interaction.options.getInteger('supprimer_messages') ?? 0;
        if (isStaffMember(target)) return interaction.reply({ content: '❌ Tu ne peux pas bannir un Staff.', flags: MessageFlags.Ephemeral });
        await target.send({ embeds: [new EmbedBuilder().setColor('#c0392b')
            .setTitle('🔨 Tu as été banni de UXDER')
            .setDescription(`**Raison :** ${raison}`)
            .setFooter({ text: 'UXDER • Modération' }).setTimestamp()] }).catch(() => {});
        await guild.members.ban(target, { reason: raison, deleteMessageSeconds: deletedays * 86400 }).catch(() => {});
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#c0392b')
            .setDescription(`🔨 <@${target.id}> a été banni du serveur.\n**Raison :** ${raison}`)] });
        await logSanction('🔨 Ban', '#c0392b', [
            { name: 'Membre', value: `${target.user.tag}`, inline: true },
            { name: 'Modérateur', value: `<@${member.id}>`, inline: true },
            { name: 'Raison', value: raison }
        ]);
    }

    // ── /unban ─────────────────────────────────────────────────────────────────
    if (commandName === 'unban') {
        if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const userId = interaction.options.getString('user_id');
        await guild.members.unban(userId).catch(() => {});
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#2ecc71')
            .setDescription(`✅ L'utilisateur \`${userId}\` a été débanni.`)] });
        await logSanction('✅ Unban', '#2ecc71', [
            { name: 'User ID', value: userId, inline: true },
            { name: 'Modérateur', value: `<@${member.id}>`, inline: true }
        ]);
    }

    // ── /warn ──────────────────────────────────────────────────────────────────
    if (commandName === 'warn') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const target = interaction.options.getMember('membre');
        const raison = interaction.options.getString('raison');
        const { error } = await supabase.from('warns').insert([{
            user_id: target.id, moderator_id: member.id, reason: raison, guild_id: guild.id
        }]);
        if (error) console.error("Supabase warn:", error.message);
        await target.send({ embeds: [new EmbedBuilder().setColor('#ff6b35')
            .setTitle('⚠️ Tu as reçu un avertissement sur UXDER')
            .setDescription(`**Raison :** ${raison}\n\n*En cas de récidive, des sanctions plus lourdes pourront être appliquées.*`)
            .setFooter({ text: 'UXDER • Modération' }).setTimestamp()] }).catch(() => {});
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff6b35')
            .setDescription(`⚠️ <@${target.id}> a reçu un avertissement.\n**Raison :** ${raison}`)] });
        await logSanction('⚠️ Warn', '#ff6b35', [
            { name: 'Membre', value: `<@${target.id}> (${target.user.tag})`, inline: true },
            { name: 'Modérateur', value: `<@${member.id}>`, inline: true },
            { name: 'Raison', value: raison }
        ]);
    }

    // ── /warns ─────────────────────────────────────────────────────────────────
    if (commandName === 'warns') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const target = interaction.options.getMember('membre');
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { data, error } = await supabase.from('warns').select('*').eq('user_id', target.id);
        if (error || !data || data.length === 0) {
            return interaction.editReply({ content: `✅ <@${target.id}> n'a aucun avertissement enregistré.` });
        }
        const warnList = data.map((w, i) => `**${i+1}.** ${w.reason} — par <@${w.moderator_id}>`).join('\n');
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#ff6b35')
            .setTitle(`⚠️ Avertissements de ${target.user.tag}`)
            .setDescription(warnList)
            .setFooter({ text: `${data.length} avertissement(s) au total` }).setTimestamp()] });
    }

    // ── /slowmode ──────────────────────────────────────────────────────────────
    if (commandName === 'slowmode') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const secondes = interaction.options.getInteger('secondes');
        await interaction.channel.setRateLimitPerUser(secondes);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#3498db')
            .setDescription(secondes === 0
                ? `✅ Mode lent **désactivé** dans <#${interaction.channel.id}>.`
                : `🐢 Mode lent réglé sur **${secondes} seconde(s)** dans <#${interaction.channel.id}>.`)] });
    }

    // ── /lock ──────────────────────────────────────────────────────────────────
    if (commandName === 'lock') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const raison = interaction.options.getString('raison') || 'Aucune raison précisée';
        await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#e74c3c')
            .setDescription(`🔒 Ce salon a été **verrouillé** par <@${member.id}>.\n**Raison :** ${raison}`)] });
    }

    // ── /unlock ────────────────────────────────────────────────────────────────
    if (commandName === 'unlock') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: null });
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#2ecc71')
            .setDescription(`🔓 Ce salon a été **déverrouillé** par <@${member.id}>.`)] });
    }

    // ── /userinfo ──────────────────────────────────────────────────────────────
    if (commandName === 'userinfo') {
        const target = interaction.options.getMember('membre') || member;
        const roles = target.roles.cache.filter(r => r.name !== '@everyone').map(r => `<@&${r.id}>`).join(' ') || 'Aucun';
        await interaction.reply({ embeds: [new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🔍 Informations — ${target.user.tag}`)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 ID', value: target.id, inline: true },
                { name: '📅 Compte créé', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Rejoint le', value: target.joinedAt ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>` : 'Inconnu', inline: true },
                { name: `🎭 Rôles (${target.roles.cache.size - 1})`, value: roles.substring(0, 1024) }
            )
            .setTimestamp()] });
    }

    // ── /serverinfo ────────────────────────────────────────────────────────────
    if (commandName === 'serverinfo') {
        const g = interaction.guild;
        await interaction.reply({ embeds: [new EmbedBuilder()
            .setColor('#00a2ff')
            .setTitle(`📊 ${g.name}`)
            .setThumbnail(g.iconURL({ dynamic: true }))
            .addFields(
                { name: '👑 Propriétaire', value: `<@${g.ownerId}>`, inline: true },
                { name: '👥 Membres', value: `${g.memberCount}`, inline: true },
                { name: '📅 Créé le', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
                { name: '💬 Salons texte', value: `${g.channels.cache.filter(c => c.type === ChannelType.GuildText).size}`, inline: true },
                { name: '🔊 Salons vocaux', value: `${g.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size}`, inline: true },
                { name: '🎭 Rôles', value: `${g.roles.cache.size}`, inline: true }
            )
            .setTimestamp()] });
    }

    // ── /say ───────────────────────────────────────────────────────────────────
    if (commandName === 'say') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        const msg = interaction.options.getString('message');
        await interaction.channel.send(msg);
        await interaction.reply({ content: '✅ Message envoyé.', flags: MessageFlags.Ephemeral });
    }

    // ── /giveaway ──────────────────────────────────────────────────────────────
    if (commandName === 'giveaway') {
        if (!isMod) return interaction.reply({ content: '❌ Tu n\'as pas la permission.', flags: MessageFlags.Ephemeral });
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const lot = interaction.options.getString('lot');
            const dureeMin = interaction.options.getInteger('duree');
            const nbGagnants = interaction.options.getInteger('gagnants') || 1;
            const condition = interaction.options.getString('condition') || null;
            const endsAt = Date.now() + dureeMin * 60 * 1000;

            const giveawayChannel = guild.channels.cache.find(c => c.name === GIVEAWAYS_CHANNEL_NAME) || interaction.channel;

            const buildEmbed = (participants) => {
                const participantList = participants.size > 0
                    ? [...participants].slice(0, 15).map(id => `<@${id}>`).join(', ') + (participants.size > 15 ? `\n*et ${participants.size - 15} autres...*` : '')
                    : '*(Aucun pour le moment)*';

                const desc = [
                    `# 🎁 ${lot}`,
                    ``,
                    condition ? `## ⚠️ Condition :\n> **${condition}**\n` : '',
                    `### ℹ️ Détails du tirage`,
                    `> 🏆 **Gagnant(s) :** \`${nbGagnants}\``,
                    `> ⏰ **Fin :** <t:${Math.floor(endsAt / 1000)}:R>`,
                    ``,
                    `### 👥 Participants (${participants.size})`,
                    participantList
                ].filter(Boolean).join('\n');

                return new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTitle('🎉  G I V E A W A Y  🎉')
                    .setDescription(desc)
                    .setImage('https://files.catbox.moe/ukmrb3.png') // L'image Nitro du joueur
                    .setFooter({ text: `Lancé par ${interaction.user.tag}` })
                    .setTimestamp(new Date(endsAt));
            };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_enter')
                .setLabel('🎉 Participer')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('giveaway_list')
                .setLabel('👥 Voir les participants')
                .setStyle(ButtonStyle.Secondary)
        );

        const gMsg = await giveawayChannel.send({ embeds: [buildEmbed(new Set())], components: [row] });
        activeGiveaways.set(gMsg.id, {
            lot, nbGagnants, endsAt, condition,
            participants: new Set(),
            messageId: gMsg.id,
            channelId: giveawayChannel.id,
            buildEmbed,
            gMsg
        });

        await interaction.editReply({ content: `✅ Giveaway lancé dans <#${giveawayChannel.id}> !` });

        // ─── Tirage au sort automatique ─────────────────────────────────────────
        setTimeout(async () => {
            const gData = activeGiveaways.get(gMsg.id);
            if (!gData) return;
            activeGiveaways.delete(gMsg.id);

            const participants = [...gData.participants];

            const endEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('🎉  G I V E A W A Y  T E R M I N É  🎉')
                .setImage('https://files.catbox.moe/ukmrb3.png')
                .setTimestamp();

            if (participants.length === 0) {
                endEmbed.setDescription(`# 🎁 ${lot}\n\n## ❌ Aucun participant.\nLe lot n'a pas été remporté.`);
                await gMsg.edit({ embeds: [endEmbed], components: [] });
                return;
            }

            const winners = [];
            const pool = [...participants];
            for (let i = 0; i < Math.min(nbGagnants, pool.length); i++) {
                const idx = Math.floor(Math.random() * pool.length);
                winners.push(pool.splice(idx, 1)[0]);
            }

            const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
            const participantMentions = participants.slice(0, 15).map(id => `<@${id}>`).join(', ') + (participants.length > 15 ? `\n*et ${participants.length - 15} autres...*` : '');

            endEmbed
                .setColor('#2ecc71') // Vert pour montrer que c'est fini et gagné
                .setDescription([
                    `# 🎁 ${lot}`,
                    ``,
                    condition ? `## ⚠️ Condition :\n> **${condition}**\n` : '',
                    `### 🏆 Gagnant(s)`,
                    `> 🎉 **${winnerMentions}**`,
                    ``,
                    `### 👥 Participants (${participants.length})`,
                    participantMentions
                ].filter(Boolean).join('\n'));

            await gMsg.edit({ embeds: [endEmbed], components: [] });

            // Message d'annonce avec mention des gagnants
            await giveawayChannel.send({
                content: `🎊 **FÉLICITATIONS** ${winnerMentions} !\nTu remportes **${lot}** ! 🎁 Contacte le Staff pour récupérer ton lot.`,
                embeds: [new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setDescription(`> 🔗 [Voir le giveaway](${gMsg.url})\n> 📋 Organisé par <@${interaction.user.id}>`)
                ]
            });

        }, dureeMin * 60 * 1000);
        
        } catch (error) {
            console.error('Erreur lancement giveaway:', error);
            await interaction.editReply({ content: `❌ Une erreur est survenue : ${error.message}` }).catch(() => {});
        }
    }

    // ── MUSIQUE ─────────────────────────────────────────────────────────────────

    if (['play','skip','stop','pause','resume','queue','nowplaying','volume','playlist'].includes(commandName)) {
        const voiceChannel = member.voice.channel;
        if (!voiceChannel && ['play','playlist'].includes(commandName)) {
            return interaction.reply({ content: '❌ Tu dois être dans un salon vocal pour lancer de la musique !', flags: MessageFlags.Ephemeral });
        }

        const queue = player.nodes.get(guild.id);

        // Helper interne pour lancer la lecture
        async function playQuery(query, requestedBy) {
            const { track } = await player.play(voiceChannel, query, {
                requestedBy,
                nodeOptions: {
                    metadata: { channel: interaction.channel },
                    selfDeaf: false,  // Bot peut parler (pas sourdine)
                    volume: 80,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 30000,
                    leaveOnEnd: false,
                }
            });
            return track;
        }

        // ─── /play ──────────────────────────────────────────────────────────
        if (commandName === 'play') {
            await interaction.deferReply();
            const query = interaction.options.getString('query');
            try {
                const track = await playQuery(query, interaction.user);
                const currentQueue = player.nodes.get(guild.id);
                const queueSize = currentQueue?.tracks?.size || 0;

                await interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor('#5865f2')
                    .setTitle(queueSize > 0 ? '📋 Ajouté à la file d\'attente' : '🎵 Lecture lancée !')
                    .setDescription(`### [${track.title}](${track.url})`)
                    .addFields(
                        { name: '👤 Artiste', value: track.author || 'Inconnu', inline: true },
                        { name: '⏱️ Durée', value: track.duration || '?', inline: true },
                        { name: '🔗 Source', value: track.source || 'YouTube', inline: true }
                    )
                    .setThumbnail(track.thumbnail)
                    .setFooter({ text: `Demandé par ${interaction.user.username}` })
                ]});
            } catch (err) {
                console.error('Erreur play:', err.message);
                await interaction.editReply({ content: `❌ Erreur : \`${err.message}\`` });
            }
        }

        // ─── /playlist (lien playlist Spotify/YouTube de n'importe qui) ────
        if (commandName === 'playlist') {
            await interaction.deferReply();
            const url = interaction.options.getString('url');
            try {
                const result = await player.search(url, { requestedBy: interaction.user });
                if (!result || result.isEmpty()) {
                    return interaction.editReply({ content: '❌ Playlist introuvable. Vérifie que le lien est correct et que la playlist est publique !' });
                }
                const { tracks } = result;
                const q = player.nodes.get(guild.id) || await player.nodes.create(guild, {
                    metadata: { channel: interaction.channel },
                    selfDeaf: false,
                    volume: 80,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 30000,
                    leaveOnEnd: false,
                });
                if (!q.connection) await q.connect(voiceChannel);
                for (const t of tracks) q.addTrack(t);
                if (!q.node.isPlaying()) await q.node.play();

                await interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor('#1DB954') // Vert Spotify
                    .setTitle('🎵 Playlist importée !')
                    .setDescription(`**${tracks.length} musiques** ajoutées à la file d'attente !`)
                    .addFields(
                        { name: '📋 Playlist', value: result.playlist?.title || url, inline: false },
                        { name: '🎵 Première musique', value: `[${tracks[0].title}](${tracks[0].url})`, inline: false }
                    )
                    .setThumbnail(result.playlist?.thumbnail || tracks[0].thumbnail)
                    .setFooter({ text: `Importée par ${interaction.user.username}` })
                ]});
            } catch (err) {
                console.error('Erreur playlist:', err.message);
                await interaction.editReply({ content: `❌ Erreur : \`${err.message}\`` });
            }
        }

        // ─── /skip ──────────────────────────────────────────────────────────
        if (commandName === 'skip') {
            if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours !', flags: MessageFlags.Ephemeral });
            queue.node.skip();
            await interaction.reply({ content: '⏭️ Musique skippée !' });
        }

        // ─── /stop ──────────────────────────────────────────────────────────
        if (commandName === 'stop') {
            if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours !', flags: MessageFlags.Ephemeral });
            queue.delete();
            await interaction.reply({ content: '⏹️ Musique arrêtée et bot déconnecté !' });
        }

        // ─── /pause ─────────────────────────────────────────────────────────
        if (commandName === 'pause') {
            if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours !', flags: MessageFlags.Ephemeral });
            queue.node.pause();
            await interaction.reply({ content: '⏸️ Musique mise en pause !' });
        }

        // ─── /resume ────────────────────────────────────────────────────────
        if (commandName === 'resume') {
            if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours !', flags: MessageFlags.Ephemeral });
            queue.node.resume();
            await interaction.reply({ content: '▶️ Musique reprise !' });
        }

        // ─── /queue ─────────────────────────────────────────────────────────
        if (commandName === 'queue') {
            if (!queue || queue.isEmpty()) return interaction.reply({ content: '📋 La file d\'attente est vide !', flags: MessageFlags.Ephemeral });
            const tracks = queue.tracks.toArray().slice(0, 10);
            const current = queue.currentTrack;
            const embed = new EmbedBuilder()
                .setColor('#5865f2')
                .setTitle('📋 File d\'attente')
                .setDescription([
                    current ? `**▶️ En cours :** [${current.title}](${current.url}) — ${current.duration}` : '',
                    ``,
                    tracks.length ? tracks.map((t, i) => `**${i+1}.** [${t.title}](${t.url}) — ${t.duration}`).join('\n') : '*Pas d\'autres musiques*',
                    queue.tracks.size > 10 ? `\n*...et ${queue.tracks.size - 10} autres*` : ''
                ].join('\n'));
            await interaction.reply({ embeds: [embed] });
        }

        // ─── /nowplaying ────────────────────────────────────────────────────
        if (commandName === 'nowplaying') {
            if (!queue || !queue.currentTrack) return interaction.reply({ content: '❌ Aucune musique en cours !', flags: MessageFlags.Ephemeral });
            const track = queue.currentTrack;
            const progress = queue.node.createProgressBar();
            const embed = new EmbedBuilder()
                .setColor('#5865f2')
                .setTitle('🎶 En cours de lecture')
                .setDescription(`### [${track.title}](${track.url})\n\n${progress}`)
                .addFields(
                    { name: '👤 Artiste', value: track.author || 'Inconnu', inline: true },
                    { name: '⏱️ Durée', value: track.duration || '?', inline: true },
                    { name: '🔗 Source', value: track.source || 'YouTube', inline: true }
                )
                .setThumbnail(track.thumbnail)
                .setFooter({ text: `Demandé par ${track.requestedBy?.username || 'quelqu\'un'}` });
            await interaction.reply({ embeds: [embed] });
        }

        // ─── /volume ────────────────────────────────────────────────────────
        if (commandName === 'volume') {
            if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours !', flags: MessageFlags.Ephemeral });
            const niveau = interaction.options.getInteger('niveau');
            queue.node.setVolume(niveau);
            await interaction.reply({ content: `🔊 Volume réglé à **${niveau}%** !` });
        }

        return;
    }

    // ── /setup_verify ──────────────────────────────────────────────────────────

    if (commandName === 'setup_verify') {
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Admin seulement.', flags: MessageFlags.Ephemeral });
        const bienvenueChannel = guild.channels.cache.find(c => c.name === BIENVENUE_CHANNEL_NAME);
        if (!bienvenueChannel) return interaction.reply({ content: '❌ Salon bienvenue introuvable.', flags: MessageFlags.Ephemeral });

        const embed = new EmbedBuilder()
            .setColor('#f48fb1')
            .setTitle('🌸 𝐕𝐄́𝐑𝐈𝐅𝐈𝐂𝐀𝐓𝐈𝐎𝐍 𝐔𝐗𝐃𝐄𝐑 ⛩️')
            .setDescription('Bienvenue sur **UXDER** ! 🎉\n\nAvant d\'accéder au serveur, merci de confirmer que tu as lu notre règlement.\n\n> 📜 Consulte <#1532894465809715402> avant de continuer\n> ✅ Clique sur le bouton ci-dessous pour obtenir accès au serveur')
            .setFooter({ text: 'UXDER Community • Vérification' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify_member')
                .setLabel('✅ J\'ai lu le règlement — Accéder au serveur')
                .setStyle(ButtonStyle.Success)
        );

        await bienvenueChannel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `✅ Panel de vérification envoyé dans <#${bienvenueChannel.id}> !`, flags: MessageFlags.Ephemeral });
    }

    // ── /setup_shop ────────────────────────────────────────────────────────────
    if (commandName === 'setup_shop') {
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Admin seulement.', flags: MessageFlags.Ephemeral });
        
        const embed = new EmbedBuilder()
            .setColor('#9b59b6')
            .setTitle('🛒 𝐁𝐎𝐔𝐓𝐈𝐐𝐔𝐄 𝐔𝐗𝐃𝐄𝐑 ⛩️')
            .setDescription('Bienvenue dans la boutique officielle !\nClique sur le bouton ci-dessous pour ouvrir un ticket d\'achat. L\'équipe s\'occupera de ta commande.')
            .addFields(
                { name: '💎 Nitro Discord', value: '🔹 1 Mois = **4,00 €**', inline: true },
                { name: '✨ Décorations de profil', value: '🔹 L\'unité = **3,00 €**', inline: true },
                { name: '💳 Moyens de paiement acceptés', value: 'PayPal (Proches) | Crypto | Lydia | Paylib' }
            )
            .setImage('https://i.imgur.com/B942yeb.gif') // Un p'tit gif d'ambiance premium
            .setFooter({ text: 'UXDER Store • Achats sécurisés' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('shop_buy')
                .setLabel('🛒 Acheter un produit')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `✅ Boutique installée dans ce salon !`, flags: MessageFlags.Ephemeral });
    }
});

// ─── TICKETS : OUVERTURE (Via Menu ou Boutique) ─────────────────────────────
client.on('interactionCreate', async (interaction) => {
    let categoryVal = null;

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        categoryVal = interaction.values[0];
    } else if (interaction.isButton() && interaction.customId === 'shop_buy') {
        categoryVal = 'buy';
    }
    
    if (categoryVal) {
        const userId = interaction.user.id;
        
        if (activeTicketCreations.has(userId)) {
            return interaction.reply({ content: '⏳ Création en cours...', flags: MessageFlags.Ephemeral });
        }
        activeTicketCreations.add(userId);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guild = interaction.guild;
            const channelName = `${categoryVal}-${interaction.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

            const existingTicket = guild.channels.cache.find(c => 
                c.name.includes(interaction.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()) &&
                (c.name.startsWith('buy-') || c.name.startsWith('partner-') || c.name.startsWith('support-'))
            );
            if (existingTicket) return interaction.reply({ content: `❌ Tu as déjà un ticket ouvert ici : <#${existingTicket.id}>.`, ephemeral: true });

            let ticketCategory = guild.channels.cache.find(c => c.name === '🎫 TICKETS EN COURS' && c.type === ChannelType.GuildCategory);
            if (!ticketCategory) ticketCategory = await guild.channels.create({ name: '🎫 TICKETS EN COURS', type: ChannelType.GuildCategory });

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: ticketCategory.id,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    // Staff voit tous les tickets
                    ...STAFF_ROLES.map(roleId => ({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }))
                ],
            });

            const { error } = await supabase.from('tickets').insert([{ user_id: interaction.user.id, channel_id: ticketChannel.id, status: 'open' }]);
            if (error) console.error("Supabase Insert:", error.message);

            const embed = new EmbedBuilder().setColor('#00a2ff').setTitle(`🎫 Ticket — ${categoryVal.toUpperCase()}`).setTimestamp();

            if (categoryVal === 'buy') {
                embed.setDescription(`Bienvenue <@${interaction.user.id}> dans ton espace d'achat ! 🛒\n\n**Pour que le Staff traite ta commande rapidement, merci de nous indiquer :**\n\n> 🔹 L'article ou le service que tu souhaites acheter\n> 🔹 Ton moyen de paiement préféré (PayPal, Crypto, Lydia...)\n> 🔹 Toute information supplémentaire utile\n\nUn membre du Staff reviendra vers toi très vite !`)
                    .setFooter({ text: 'UXDER • Boutique' });
            } else if (categoryVal === 'partner') {
                embed.setDescription(`Bienvenue <@${interaction.user.id}> ! 🤝\n\nTu souhaites faire un partenariat avec **UXDER** ? Excellente initiative !\n\n**Merci de nous transmettre les infos suivantes :**\n\n> 🔹 Le lien de ton serveur / projet\n> 🔹 Ton nombre de membres & ton activité\n> 🔹 Ce que tu proposes en échange\n> 🔹 Tes coordonnées (Discord)\n\nNous étudions chaque demande avec sérieux.`)
                    .setFooter({ text: 'UXDER • Partenariats' });
            } else {
                embed.setDescription(`Bienvenue <@${interaction.user.id}> ! 🆘\n\nUn membre de notre Staff va prendre en charge ta demande dès que possible.\n\n**Pour aller plus vite, merci de :**\n\n> 🔹 Expliquer ton problème avec le maximum de détails\n> 🔹 Joindre des captures d'écran si nécessaire\n> 🔹 Rester disponible dans ce salon\n\nMerci de ta patience !`)
                    .setFooter({ text: 'UXDER • Support' });
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
            await interaction.editReply({ content: `✅ Ton ticket a été ouvert : <#${ticketChannel.id}>` });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "❌ Une erreur est survenue." }).catch(() => {});
        } finally {
            setTimeout(() => activeTicketCreations.delete(userId), 3000);
        }
    }

    // ─── TICKETS : FERMETURE ──────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'ticket_close') {
        const isStaff = isStaffMember(interaction.member) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
        const isOwner = interaction.channel.name.includes(interaction.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());

        if (!isStaff && !isOwner) return interaction.reply({ content: '❌ Seul le staff ou le créateur du ticket peut le fermer.', flags: MessageFlags.Ephemeral });

        // deferReply évite le timeout Discord sur les opérations longues
        await interaction.deferReply();
        await interaction.editReply({ content: '🔒 Fermeture du ticket en cours...' });

        try {
            await supabase.from('tickets').update({ status: 'closed' }).eq('channel_id', interaction.channel.id);
            
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            let htmlTranscript = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Transcript - ${interaction.channel.name}</title>
            <style>body{background:#36393f;color:#dcddde;font-family:sans-serif;padding:20px;} .msg{margin-bottom:12px;} .author{color:#fff;font-weight:bold;} .time{color:#72767d;font-size:12px;margin-left:8px;}</style>
            </head><body><h2 style="color:#fff">📋 Transcript : ${interaction.channel.name}</h2>`;
            
            messages.reverse().forEach(m => {
                if (m.content) htmlTranscript += `<div class="msg"><span class="author">${m.author.tag}</span><span class="time">${m.createdAt.toLocaleString('fr-FR')}</span><p>${m.content}</p></div>`;
            });
            htmlTranscript += `</body></html>`;

            const transcriptPath = path.join(__dirname, `${interaction.channel.name}.html`);
            fs.writeFileSync(transcriptPath, htmlTranscript);

            let ticketOwnerUsername = interaction.channel.name.split('-')[1] || '';
            const member = interaction.guild.members.cache.find(m => m.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === ticketOwnerUsername);
            
            if (member) {
                await member.send({ content: `🎫 Voici le transcript de ton ticket **${interaction.channel.name}** fermé sur UXDER.`, files: [transcriptPath] }).catch(() => {});
            }
            fs.unlinkSync(transcriptPath);
            await interaction.editReply({ content: '✅ Ticket fermé ! Suppression dans 3 secondes...' }).catch(() => {});
            setTimeout(async () => { await interaction.channel.delete().catch(() => {}); }, 3000);

        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: '❌ Erreur lors de la fermeture.' }).catch(() => {});
        }
    }

    // ─── VÉRIFICATION ─────────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'verify_member') {
        if (interaction.member.roles.cache.has(MEMBER_ROLE_ID)) {
            return interaction.reply({ content: '✅ Tu as déjà été vérifié et tu as accès au serveur !', flags: MessageFlags.Ephemeral });
        }
        
        await interaction.member.roles.add(MEMBER_ROLE_ID).catch(() => {});
        const visitorRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('visiteur'));
        if (visitorRole) await interaction.member.roles.remove(visitorRole).catch(() => {});

        await interaction.reply({ content: '🎉 Bienvenue ! Tu as maintenant accès à tout le serveur.', flags: MessageFlags.Ephemeral });
    }

    // ─── GIVEAWAY : Participer ────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'giveaway_enter') {
        const gData = activeGiveaways.get(interaction.message.id);
        if (!gData) {
            return interaction.reply({ content: '❌ Ce giveaway est déjà terminé !', flags: MessageFlags.Ephemeral });
        }

        if (gData.participants.has(interaction.user.id)) {
            gData.participants.delete(interaction.user.id);
            // Mettre à jour l'embed avec le nouveau compte de participants
            await gData.gMsg.edit({ embeds: [gData.buildEmbed(gData.participants)] }).catch(() => {});
            return interaction.reply({ content: '🚪 Tu as quitté le giveaway.', flags: MessageFlags.Ephemeral });
        } else {
            gData.participants.add(interaction.user.id);
            // Mettre à jour l'embed avec le nouveau participant
            await gData.gMsg.edit({ embeds: [gData.buildEmbed(gData.participants)] }).catch(() => {});
            return interaction.reply({ content: '🎉 Participation validée ! Bonne chance 🍀', flags: MessageFlags.Ephemeral });
        }
    }

    // ─── GIVEAWAY : Voir les participants ────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'giveaway_list') {
        const gData = activeGiveaways.get(interaction.message.id);
        if (!gData) {
            return interaction.reply({ content: '❌ Ce giveaway est déjà terminé !', flags: MessageFlags.Ephemeral });
        }

        if (gData.participants.size === 0) {
            return interaction.reply({ content: '👥 Aucun participant pour l\'instant.', flags: MessageFlags.Ephemeral });
        }

        const list = [...gData.participants].map((id, i) => `**${i + 1}.** <@${id}>`).join('\n');
        return interaction.reply({
            content: `👥 **Participants du giveaway (${gData.participants.size}) :**\n${list}`,
            flags: MessageFlags.Ephemeral
        });
    }
});

// ─── REMERCIEMENTS AUTO POUR LES BOOSTS ────────────────────────────────────
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // Si le membre n'avait pas le premium et l'a maintenant (nouveau boost)
    if (!oldMember.premiumSince && newMember.premiumSince) {
        const boostChannel = newMember.guild.channels.cache.find(c => c.name === '💎・boosts');
        if (boostChannel) {
            const embed = new EmbedBuilder()
                .setColor('#ff73fa')
                .setTitle('✨ 𝐍𝐎𝐔𝐕𝐄𝐀𝐔 𝐁𝐎𝐎𝐒𝐓 𝐃𝐄 𝐒𝐄𝐑𝐕𝐄𝐔𝐑 ✨')
                .setDescription(`Merci infiniment <@${newMember.id}> pour ton boost ! 💖\nGrâce à toi, le serveur franchit un nouveau palier !`)
                .setImage('https://files.catbox.moe/30cqlf.png') // L'image de boost du joueur
                .setFooter({ text: 'UXDER Community • Merci de ton soutien !' })
                .setTimestamp();
            
            await boostChannel.send({ content: `<@${newMember.id}>`, embeds: [embed] }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
