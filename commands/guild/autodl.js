const { setURL, getURLs } = require("@utils/guildsettings");
const { MessageEmbed, Formatters } = require("discord.js");

module.exports = {
  name: "autodl",
  description: "add URLs to automatically download video from",
  required_perms: "MANAGE_SERVER",
  slash: true,
  options: [
    { name: "list", type: "SUB_COMMAND", description: "list all of the auto-dl URLs for this server" },
    {
      name: "url",
      type: "SUB_COMMAND",
      description: "add a new URL to auto-dl",
      options: [
        {
          name: "url",
          type: "STRING",
          description: "the url to add or remove",
          required: true,
        },
      ],
    },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();

    if (!interaction.guild) return interaction.reply("🚫 **This command can only be used in guilds!**");

    const listEmbed = urls => {
      return new MessageEmbed()
        .setTitle(`${interaction.guild.name}'s auto-dl list`)
        .setColor("BLURPLE")
        .setDescription(Formatters.codeBlock(urls.join("\n")));
    };

    if (isSlash ? interaction?.options?.getSubCommand() === "list" : !args.length) {
      const urls = await getURLs(interaction.guild.id);

      if (!urls.length) {
        return interaction.reply("⚠ **This server's auto-dl list is empty.**");
      }

      interaction.reply({ embeds: [listEmbed(urls)], ephemeral: true });
    } else {
      const input = isSlash ? interaction.options.getString("url") : args[0];

      try {
        const url = new URL(input.replace(/[<>]/g, ""));

        const res = await setURL(interaction.guild.id, url.origin);

        if (res) {
          const str = `✅ **Added \`${url.origin}\` to auto-dl URL list!**`;
          interaction.reply(str);
        } else {
          const str = `✅ **Removed \`${url.origin}\` from auto-dl URL list!**`;
          interaction.reply(str);
        }
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          return interaction.reply({ content: "🚫 **Invalid URL!**", ephemeral: true });
        }
      }
    }
  },
};
