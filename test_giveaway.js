require('dotenv').config();
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

try {
    const lot = "Nitro";
    const dureeMin = 10;
    const nbGagnants = 1;
    const condition = "Aucune";
    const endsAt = Date.now() + dureeMin * 60 * 1000;
    
    const interaction = { user: { tag: 'TestUser#1234' } };

    const buildEmbed = (participants) => {
        const participantList = participants.size > 0
            ? [...participants].slice(0, 20).map(id => `<@${id}>`).join(', ') + (participants.size > 20 ? ` *+${participants.size - 20} autres...*` : '')
            : '*Aucun participant pour l\'instant...*';

        const desc = [
            `🎁 **Lot :** ${lot}`,
            `🏆 **Gagnant(s) :** ${nbGagnants}`,
            `⏰ **Fin :** <t:${Math.floor(endsAt / 1000)}:R> (<t:${Math.floor(endsAt / 1000)}:T>)`,
            condition ? `📋 **Condition :** ${condition}` : null,
            `👥 **Participants (${participants.size}) :**\n${participantList}`,
        ].filter(Boolean).join('\n');

        return new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('🎉 GIVEAWAY EN COURS !')
            .setDescription(desc)
            .setFooter({ text: `Organisé par ${interaction.user.tag} • UXDER` })
            .setTimestamp(new Date(endsAt));
    };

    const embed = buildEmbed(new Set());
    console.log("Embed build success:", embed.toJSON());
    
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
    console.log("Row build success.");
} catch (e) {
    console.error("ERROR:", e);
}
