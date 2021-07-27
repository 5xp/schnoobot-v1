const { addURL, removeURL, getURLs } = require("@utils/guildsettings");
const { MessageEmbed, Formatters } = require("discord.js");

module.exports = {
  name: "autodl",
  description: "add URLs to automatically download video from",
  required_perms: "MANAGE_SERVER",
  slash: true,
  options: [
    { name: "list", type: "SUB_COMMAND", description: "list all of the auto-dl URLs for this server" },
    {
      name: "add",
      type: "SUB_COMMAND",
      description: "add a new URL to auto-dl",
      options: [
        {
          name: "url",
          type: "STRING",
          description: 'the beginning of the url to add, such as "https://vm.tiktok.com"',
          required: true,
        },
      ],
    },
    {
      name: "remove",
      type: "SUB_COMMAND",
      description: "remove a URL from auto-dl",
      options: [{ name: "url", type: "STRING", description: "the url to remove from auto-dl", required: true }],
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
        return interaction.reply("**This server's auto-dl list is empty.**");
      }

      interaction.reply({ embeds: [listEmbed(urls)] });
    } else {
      const input = isSlash ? interaction.options.getString("url") : args[0];

      if (isSlash ? interaction?.options?.getSubCommand() === "add" : args.length) {
        try {
          url = new URL(input.replace(/[<>]/g, ""));
          try {
            const urls = await addURL(interaction.guild.id, url.origin);

            interaction.reply({
              content: `✅ **Added \`${url.origin}\` to auto-dl URL list!**`,
              embeds: [listEmbed(urls)],
            });
          } catch (error) {
            interaction.reply({ content: `🚫 **${error.message}**`, embeds: [listEmbed(error.urls)] });
          }
        } catch (error) {
          if (error.code === "ERR_INVALID_URL") {
            return interaction.reply({ content: "🚫 **Invalid URL!**", ephemeral: true });
          }
        }
      } else if (interaction?.options?.getSubCommand() === "remove") {
        // remove
        try {
          const urls = await removeURL(interaction.guild.id, input);
          interaction.reply({
            content: `\✅ **Removed \`${input}\` from auto-dl URL list!**`,
            embeds: [listEmbed(urls)],
          });
        } catch (error) {
          interaction.reply({ content: `🚫 **${error.message}**`, embeds: [listEmbed(error.urls)] });
        }
      }
    }
  },
};
