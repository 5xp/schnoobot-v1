const { setPrefix, getPrefix } = require("@utils/guildsettings");

module.exports = {
  name: "prefix",
  description: "set guild prefix",
  required_perms: ["MANAGE_GUILD"],
  usage: `${process.env.PREFIX}prefix <new prefix>\n${process.env.PREFIX}prefix\n${process.env.PREFIX}prefix reset`,
  slash: true,
  options: [
    { name: "view", type: "SUB_COMMAND", description: "view this server's prefix" },
    {
      name: "change",
      type: "SUB_COMMAND",
      description: "modify this server's prefix",
      options: [{ name: "prefix", type: "STRING", description: "the new prefix to use", required: true }],
    },
    { name: "reset", type: "SUB_COMMAND", description: "reset this server's prefix to default" },
  ],
  async execute(interaction, args, content) {
    if (!interaction.guild) {
      return interaction.reply({ content: "⚠ **This command can only be used in a guild.**", ephemeral: true });
    }

    const isSlash = interaction.isCommand?.();

    if (isSlash) {
      switch (interaction.options.getSubcommand()) {
        case "view":
          interaction.reply({
            content: `**Your current prefix is \`${await getPrefix(interaction.guild.id)}\`.**`,
            ephemeral: true,
          });
          break;

        case "reset":
          setPrefix(interaction.guild.id, null);
          interaction.reply({ content: `✅ **Reset guild's prefix to \`${process.env.PREFIX}\`.**`, ephemeral: true });
          break;

        case "change": {
          const newPrefix = interaction.options.getString("prefix");
          setPrefix(interaction.guild.id, newPrefix);
          interaction.reply({ content: `✅ **Changed guild prefix to \`${newPrefix}\`!**`, ephemeral: true });
          break;
        }
      }
    } else if (args.length) {
      const newPrefix = content;

      if (newPrefix == "reset") {
        setPrefix(interaction.guild.id, null);
        return interaction.reply(`✅ **Reset guild's prefix to \`${process.env.PREFIX}\`.**`);
      }

      setPrefix(interaction.guild.id, newPrefix);
      interaction.reply(`✅ **Changed guild prefix to \`${newPrefix}\`!**`);
    } else {
      interaction.reply(`**Your current prefix is \`${await getPrefix(interaction.guild.id)}\`.**`);
    }
  },
};
