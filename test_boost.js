require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        const boostChannel = guild.channels.cache.find(c => c.name === '💎・boosts');

        if (boostChannel) {
            const embed = new EmbedBuilder()
                .setColor('#ff73fa')
                .setTitle('✨ 𝐍𝐎𝐔𝐕𝐄𝐀𝐔 𝐁𝐎𝐎𝐒𝐓 𝐃𝐄 𝐒𝐄𝐑𝐕𝐄𝐔𝐑 ✨')
                .setDescription(`Merci infiniment <@${client.user.id}> pour ton boost ! 💖\nGrâce à toi, le serveur franchit un nouveau palier !`)
                .setImage('https://files.catbox.moe/30cqlf.png') // L'image de boost du joueur
                .setFooter({ text: 'UXDER Community • Ceci est un test' })
                .setTimestamp();
            
            await boostChannel.send({ content: `<@${client.user.id}>`, embeds: [embed] });
            console.log("Message de test envoyé !");
        } else {
            console.log("Salon introuvable");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
