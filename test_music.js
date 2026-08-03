require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = new Player(client);

client.once('ready', async () => {
    try {
        console.log("Loading extractors...");
        const { DefaultExtractors, SpotifyExtractor } = require('@discord-player/extractor');
        const { YoutubeiExtractor } = require('discord-player-youtubei');
        
        await player.extractors.register(YoutubeiExtractor, {});
        await player.extractors.loadMulti(DefaultExtractors, {
            spotify: {
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                bridgeProvider: new YoutubeiExtractor() // Use youtubei as bridge
            }
        });
        console.log("Loaded extractors:", player.extractors.store.map(e => e.identifier));

        const query = "https://www.youtube.com/watch?v=9NKQRasQsQY";
        console.log(`Searching for: ${query}`);
        const result = await player.search(query);
        console.log("Result:", result.hasTracks() ? result.tracks[0].title : "No results");
        
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
