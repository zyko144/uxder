require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = new Player(client);

client.once('ready', async () => {
    try {
        console.log("Loading extractors...");
        const { DefaultExtractors } = require('@discord-player/extractor');
        const { YoutubeSabrExtractor } = require('discord-player-googlevideo');
        
        await player.extractors.register(YoutubeSabrExtractor, {});
        
        await player.extractors.loadMulti(DefaultExtractors, {
            spotify: {
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                bridgeProvider: player.extractors.get('com.github.xxczaki.youtube-sabr')
            }
        });
        console.log("Loaded extractors:", player.extractors.store.map(e => e.identifier));

        // Test YouTube link
        const query = "https://www.youtube.com/watch?v=9NKQRasQsQY";
        console.log(`Searching for: ${query}`);
        const result = await player.search(query);
        console.log("Result:");
        if (result.hasTracks()) {
            console.log(`Title: ${result.tracks[0].title}`);
            console.log(`Author: ${result.tracks[0].author}`);
            console.log(`Source: ${result.tracks[0].source}`);
            console.log(`URL: ${result.tracks[0].url}`);
        } else {
            console.log("No results");
        }
        
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
