module.exports = {
  name: ["skip", "s"],
  description: "skips the current song",
  async execute(interaction) {
    const subscription = interaction.client.subscriptions.get(interaction.guildId);

    if (subscription) {
      interaction.reply(`Skipped **${subscription.audioPlayer.state.resource.metadata.title}**`);
      subscription.audioPlayer.stop();
    } else {
      interaction.reply("Nothing playing.");
    }
  },
};
