const { MessageEmbed } = require("discord.js");

module.exports = {
  name: ["steal", "emoji"],
  description: "steal an emoji",
  required_perms: ["MANAGE_EMOJIS"],
  usage: `${process.env.PREFIX}steal <attachment/url> <name>`,
  slash: true,
  options: [
    { name: "url", type: "STRING", description: "the url of the emoji", required: true },
    { name: "name", type: "STRING", description: "the name of the emoji", required: true },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();
    let url, name, attachment;

    if (isSlash) {
      url = interaction.options.get("url").value;
      name = interaction.options.get("name").value;
    } else {
      attachment = interaction.attachments.first();

      if ((!args[0] || !args[1]) && (!attachment || !args[0])) {
        return interaction.reply(`⚠ **To use this command: \`${module.exports.usage}\`**`);
      }

      url = attachment ? attachment.url : args[0].replace(/[<>]/g, "");
      name = attachment ? args[0] : args[1];
    }

    if (name.length < 2 || name.length > 32) {
      return interaction.reply("🚫 **Emoji name must be between 2 and 32 characters long.**");
    }
    await interaction.deferReply?.();

    try {
      const emoji = await interaction.guild.emojis.create(url, name);

      const embed = new MessageEmbed()
        .setColor("GREEN")
        .setTitle("Created a new emoji")
        .setImage(emoji.url)
        .setFooter(emoji.name);

      isSlash ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
    } catch (error) {
      switch (error.code) {
        case "ENOENT":
          isSlash ? interaction.editReply("🚫 **Invalid URL.**") : interaction.reply("🚫 **Invalid URL.**");
          break;
        case 30008:
          isSlash
            ? interaction.editReply("🚫 **Guild has reached maximum emoji capacity.**")
            : interaction.reply("🚫 **Guild has reached maximum emoji capacity.**");
          break;
        case 50035: {
          const message = error.message.replace("Invalid Form Body\nimage: ", "");
          isSlash ? interaction.editReply(`🚫 **${message}**`) : interaction.reply(`🚫 **${message}**`);
          break;
        }
        default:
          isSlash
            ? interaction.editReply("🚫 **An error occurred, please try again later.**")
            : interaction.reply("🚫 **An error occurred, please try again later.**");
      }
    }
  },
};
