const { AudioPlayerStatus } = require("@discordjs/voice");

module.exports = {
  name: ["queue", "q"],
  description: "view current queue",
  async execute(interaction) {
    const subscription = interaction.client.subscriptions.get(interaction.guildId);

    if (subscription) {
      const status =
        subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
          ? "Nothing is playing."
          : `Currently playing **${subscription.audioPlayer.state.resource.metadata.title}**`;

      const queue = subscription.queue.map((track, index) => `#${index + 1}: ${track.title}`).join("\n");

      interaction.reply(`${status}\n${queue}`);
    } else {
      interaction.reply("Nothing is playing in this server.");
    }
  },
};
