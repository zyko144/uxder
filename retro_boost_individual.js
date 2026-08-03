require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        await guild.members.fetch();
        const boostChannel = guild.channels.cache.find(c => c.name === '💎・boosts');

        if (boostChannel) {
            const boosters = guild.members.cache.filter(m => m.premiumSinceTimestamp !== null);
            console.log(`Envoi de ${boosters.size} messages individuels...`);

            for (const [id, member] of boosters) {
                const embed = new EmbedBuilder()
                    .setColor('#ff73fa')
                    .setTitle('✨ 𝐍𝐎𝐔𝐕𝐄𝐀𝐔 𝐁𝐎𝐎𝐒𝐓 𝐃𝐄 𝐒𝐄𝐑𝐕𝐄𝐔𝐑 ✨')
                    .setDescription(`Merci infiniment <@${member.id}> pour ton boost ! 💖\nGrâce à toi, le serveur franchit un nouveau palier !`)
                    .setImage('https://files.catbox.moe/30cqlf.png') // L'image de boost du joueur
                    .setFooter({ text: 'UXDER Community • Merci de ton soutien !' })
                    .setTimestamp(member.premiumSinceTimestamp); // Date de leur vrai boost
                
                await boostChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
                // Pause de 1s pour éviter le rate limit de Discord
                await new Promise(r => setTimeout(r, 1000));
            }
            console.log("Terminé !");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
