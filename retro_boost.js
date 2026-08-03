require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const BOOST_CHANNEL_NAME = '💎・boosts';

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        await guild.members.fetch();

        // 1. Créer le salon s'il n'existe pas
        let boostChannel = guild.channels.cache.find(c => c.name === BOOST_CHANNEL_NAME);
        if (!boostChannel) {
            boostChannel = await guild.channels.create({
                name: BOOST_CHANNEL_NAME,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.SendMessages], // Only bot can send
                        allow: [PermissionFlagsBits.ViewChannel]
                    }
                ],
                position: 0
            });
            console.log("Salon de boost créé !");
        }

        // 2. Trouver les boosters actuels
        const boosters = guild.members.cache.filter(m => m.premiumSinceTimestamp !== null);
        console.log(`Trouvé ${boosters.size} boosters !`);

        if (boosters.size > 0) {
            const embed = new EmbedBuilder()
                .setColor('#ff73fa') // Nitro pink
                .setTitle('✨ 𝐌𝐄𝐑𝐂𝐈 𝐀𝐔𝐗 𝐁𝐎𝐎𝐒𝐓𝐄𝐑𝐒 ✨')
                .setDescription(`Un énorme merci à nos **${boosters.size}** boosters actuels qui soutiennent **UXDER** !\nGrâce à vous, le serveur grandit ! 💖\n\n` + 
                    boosters.map(m => `> 💎 <@${m.id}> *(depuis <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>)*`).join('\n'))
                .setImage('https://i.imgur.com/KqWkH0s.png') // invisible line
                .setThumbnail('https://files.catbox.moe/ukmrb3.png');

            await boostChannel.send({ embeds: [embed] });
            console.log("Message rétroactif envoyé !");
        }

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
