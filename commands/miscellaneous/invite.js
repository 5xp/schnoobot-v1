const { MessageButton } = require("discord.js");
module.exports = {
  name: ["invite", "inv"],
  description: "invite the bot to your server",
  slash: true,
  execute(interaction) {
    const inviteButton = new MessageButton().setURL(process.env.INVITE_URL).setStyle("LINK").setLabel("Invite");

    interaction.reply({
      content: "**Invite me to your server!**",
      components: [{ type: 1, components: [inviteButton] }],
      ephemeral: true,
    });
  },
};
