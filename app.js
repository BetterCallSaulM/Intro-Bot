import "dotenv/config";
import ffmpegPath from "ffmpeg-static";
import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  getVoiceConnection
} from "@discordjs/voice";

process.env.FFMPEG_PATH = ffmpegPath;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ],
});

const users = {
  "895923987111100426" : { sound: "audio/short_ball.mp3", volume : 0.015},
  "317735170905997342" : { sound: "audio/piccolo.mp3", volume : 0.015},
  "528083206940131348" : { sound: "audio/goon.mp3", volume : 0.1},
  "692934165552955392" : { sound: "audio/monkey.mp3", volume : 0.015},
  "229459112629501962" : { sound: "audio/big_d.mp3", volume : 0.015},
  "281809317013880834" : { sound: "audio/on_sight.mp3", volume : 0.015},
  "425424429322076162" : { sound: "audio/rizz.mp3", volume : 0.015},
};

const player = createAudioPlayer();

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!users[newState.id]) return;

  const { sound, volume } = users[newState.id];

  // User joined a voice channel
  if (oldState.channelId !== newState.channelId && newState.channelId) {
    const channel = newState.channel;
    let connection = getVoiceConnection(channel.guild.id);

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
    }

    const resource = createAudioResource(sound, {inlineVolume: true});
    resource.volume.setVolume(volume);
    player.play(resource);
    connection.subscribe(player);

    player.once(AudioPlayerStatus.Idle, () => {
      if (connection.state.status !== "destroyed") {
        connection.destroy();
      }
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "outro") {
    const member = interaction.member;

    if (!member.voice.channel) {
      await interaction.reply("You are not in a voice channel!");
      return;
    }
    const channel = member.voice.channel;
    let connection = getVoiceConnection(channel.guild.id);

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
    }

    const player = createAudioPlayer();
    const resource = createAudioResource("outro.mp3", { inlineVolume: true });
    resource.volume.setVolume(0.02);

    player.play(resource);
    connection.subscribe(player);

    await interaction.reply("See ya");

    player.once(AudioPlayerStatus.Idle, () => {
      try {
        member.voice.disconnect();
      } catch (err) {
        console.error(err);
      }
      connection.destroy();
    });
  }
});

client.once("clientReady", async() => {
  console.log(`Logged in as ${client.user.tag}`);

  const data = new SlashCommandBuilder()
    .setName("outro")
    .setDescription("Gives you a tuff ahh outro before you dip")
    .toJSON();

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(Routes.applicationGuildCommands(client.user.id, process.env.COOC_ID), {
    body: [data],
  });
});

client.login(process.env.DISCORD_TOKEN);