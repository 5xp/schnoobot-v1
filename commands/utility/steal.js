const { MessageEmbed, Message } = require("discord.js");

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
    let url, name;

    if (isSlash) {
      url = interaction.options.get("url").value;
      name = interaction.options.get("name").value;
      interaction.defer();
    } else {
      let attachment = interaction.attachments.first();

      if ((!args[0] || !args[1]) && (!attachment || !args[0])) {
        interaction.reply("missing arguments!");
        return;
      }

      url = args[0] && !attachment ? args[0].replace(/[<>]/g, "") : attachment.url;
      name = args[0] && !attachment ? args[1] : args[0];
    }

    const emoji = await interaction.guild.emojis.create(url, name).catch(error => {
      console.error(error);
      interaction.reply(error.message);
    });
    const embed = new MessageEmbed().setColor("GREEN").setTitle("Created a new emoji").setImage(emoji.url).setFooter(emoji.name);
    console.log(`${interaction.member.displayName} created emoji ${emoji.name} in guild ${interaction.guild.name}`.green);
    isSlash ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
  },
};
