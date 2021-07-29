const Discord = require("discord.js");
const { findMember } = require("@utils/helper.js");

module.exports = {
  name: ["avatar", "av", "pfp"],
  description: "show avatar of yourself or another user",
  usage: `${process.env.PREFIX}avatar\n${process.env.PREFIX}avatar @user`,
  slash: true,
  options: [{ name: "user", type: "USER", description: "get the avatar of this user", required: false }],
  async execute(interaction, args, content) {
    let desiredUser,
      avatarFormat = { format: "png", dynamic: true, size: 2048 };
    const isSlash = interaction?.type === "APPLICATION_COMMAND";

    if (isSlash) {
      desiredUser = interaction.options.get("user")?.user;
      if (!desiredUser) desiredUser = interaction.user;
    } else {
      const member = await findMember(content, interaction);
      desiredUser = member?.user;

      if (!args.length) {
        desiredUser = interaction.member.user;
      }

      if (!desiredUser) {
        return interaction.reply("🚫 **Could not find this user!**");
      }
    }
    const avatarEmbed = new Discord.MessageEmbed()
      .setColor("#005eff")
      .setAuthor(`${desiredUser.username}'s avatar`)
      .setImage(desiredUser.avatarURL(avatarFormat));
    interaction.reply({ embeds: [avatarEmbed] });
  },
};
