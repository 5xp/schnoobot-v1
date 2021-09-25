const { MusicSubscription, Track } = require("@utils/music");
const { entersState, joinVoiceChannel, VoiceConnectionStatus } = require("@discordjs/voice");
const yts = require("yt-search");

module.exports = {
  name: ["play", "p"],
  description: "play a song",
  async execute(interaction, args, content) {
    const subscriptions = interaction.client.subscriptions;
    let subscription = subscriptions.get(interaction.guildId);

    const res = await yts(content);

    const video = res.videos?.[0];

    if (!video) {
      interaction.reply("No videos found for that query.");
      return;
    }

    if (!subscription) {
      const channel = interaction.member?.voice?.channel;

      if (channel) {
        subscription = new MusicSubscription(
          joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
          })
        );

        subscription.voiceConnection.on("error", console.warn);
        subscriptions.set(interaction.guildId, subscription);
      } else {
        interaction.reply("Join a voice channel and try again.");
        return;
      }
    }

    try {
      await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
    } catch (error) {
      console.warn(error);
      interaction.reply("Failed to join voice channel, please try again.");
      return;
    }

    try {
      const track = await Track.from(video.url, {
        onStart() {
          // interaction.reply("Now playing").catch(console.warn);
        },
        onFinish() {
          // interaction.reply("Now finished").catch(console.warn);
        },
        onError(error) {
          console.warn(error);
          interaction.reply(`Error: ${error.message}`).catch(console.warn);
        },
      });

      subscription.enqueue(track);
      interaction.reply(`Queued up **${track.title}**`);
    } catch (error) {
      console.warn(error);
      interaction.reply("Failed to play track.");
    }
  },
};
