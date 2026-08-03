require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = new Player(client);

client.once('ready', async () => {
    try {
        console.log("Loading extractors...");
        const { DefaultExtractors } = require('@discord-player/extractor');
        const { GoogleVideoExtractor } = require('discord-player-googlevideo');
        
        await player.extractors.register(GoogleVideoExtractor, {});
        
        await player.extractors.loadMulti(DefaultExtractors, {
            spotify: {
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                bridgeProvider: player.extractors.get('com.github.xxczaki.youtube-sabr')
            }
        });
        
        const query = "https://www.youtube.com/watch?v=9NKQRasQsQY";
        console.log(`Searching for: ${query}`);
        const result = await player.search(query);
        
        if (result.hasTracks()) {
            const track = result.tracks[0];
            console.log(`Found: ${track.title}`);
            console.log("Attempting to get stream...");
            
            const extractor = player.extractors.get('com.github.xxczaki.youtube-sabr');
            const stream = await extractor.stream(track);
            
            if (stream) {
                console.log("Stream successfully extracted!", typeof stream, stream.type);
            } else {
                console.log("Stream extraction returned null or undefined.");
            }
        } else {
            console.log("No results");
        }
        
    } catch(e) {
        console.error("Crash during test:", e);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
