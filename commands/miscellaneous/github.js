const { MessageButton } = require("discord.js");
module.exports = {
  name: ["github"],
  description: "view schnoobot's github",
  slash: true,
  execute(interaction) {
    const gitButton = new MessageButton().setURL(process.env.GITHUB_URL).setStyle("LINK").setLabel("Github");

    interaction.reply({
      content: "**View Schnoobot's Github!**",
      components: [{ type: 1, components: [gitButton] }],
      ephemeral: true,
    });
  },
};
