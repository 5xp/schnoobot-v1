const { MessageEmbed, MessageButton, Collection } = require("discord.js");

module.exports = {
  name: ["help", "h"],
  description: "help",
  usage: `${process.env.PREFIX}help <command?>`,
  slash: true,
  options: [
    { name: "command", type: "STRING", description: "get detailed help for a specific command", required: false },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();
    const { client } = interaction;
    const user = isSlash ? interaction.user : interaction.author;
    let currentPage = 0;

    const categories = [...new Set(client.commands.map(command => command.category))];

    if (user.id !== client.application.owner.id) {
      categories.delete("owner");
    }

    const commandsPerCategory = new Collection();

    for (const category of categories) {
      commandsPerCategory.set(
        category,
        client.commands.filter(command => command.category === category)
      );
    }

    if (isSlash ? !interaction.options.getString("command") : !args[0]) {
      await interaction.deferReply?.();

      const msgObject = () => {
        const leftButton = new MessageButton().setEmoji("875608045416218635").setStyle("PRIMARY").setCustomId("left");
        const rightButton = new MessageButton().setEmoji("875607895482458122").setStyle("PRIMARY").setCustomId("right");

        if (currentPage === categories.length - 1) rightButton.setDisabled();
        if (currentPage === 0) leftButton.setDisabled();

        return {
          components: [{ type: 1, components: [leftButton, rightButton] }],
          embeds: [getGenericEmbed(currentPage)],
        };
      };

      const msg = isSlash ? await interaction.editReply(msgObject()) : await interaction.reply(msgObject());

      const filter = button => button.user.id === user.id;

      const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", button => {
        if (button.customId === "right") {
          currentPage++;
          button.update(msgObject());
        } else {
          currentPage--;
          button.update(msgObject());
        }
      });
    } else {
      const desiredCmd = isSlash ? interaction.options.getString("command").toLowerCase() : args[0].toLowerCase();
      const embed = getDetailedEmbed(desiredCmd);
      if (embed) interaction.reply({ embeds: [embed] });
      else interaction.reply(`🚫 **\`${desiredCmd}\` is not a valid command.**`);
    }

    function getGenericEmbed(page) {
      const helpEmbed = new MessageEmbed();
      const category = categories[page];
      const commands = commandsPerCategory.get(category);

      return helpEmbed
        .setColor("#f03e1f")
        .setAuthor(`${category} commands`)
        .setDescription(`${commands.map(command => `**${command.name[0]}:** ${command.description}`).join("\n")}`)
        .setFooter(`Page ${page + 1}/${categories.length}`);
    }

    function getDetailedEmbed(cmd) {
      cmd = client.commands.find(command => command.name.includes(cmd));

      if (!cmd) return;

      const helpEmbed = new MessageEmbed()
        .setColor("#f03e1f")
        .setTitle(`Details for ${process.env.PREFIX}${cmd.name[0] || cmd.name}`)
        .addField("**Description**", cmd.description);

      if (cmd.usage) helpEmbed.addField("**Usage**", `\`${cmd.usage}\``, true);
      if (cmd.name.length > 1) helpEmbed.addField("**Aliases**", cmd.name.join(", "));
      if (cmd.required_perms) {
        helpEmbed.addField("**Permissions required**", cmd.required_perms.map(command => `\`${command}\``).join(", "));
      }

      return helpEmbed;
    }
  },
};
