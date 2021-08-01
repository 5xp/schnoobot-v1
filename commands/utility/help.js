const { MessageEmbed, MessageButton } = require("discord.js");
const fs = require("fs");
const path = require("path");
const handlerFile = "command-handler.js";

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
    const isOwner = isSlash
      ? interaction.user.id === interaction.client.application.owner.id
      : interaction.author.id === interaction.client.application.owner.id;
    let { client } = interaction;
    let currentPage = 0;
    let cmdlist = {};

    const readCommands = dir => {
      const files = fs.readdirSync(path.join(__dirname, dir));
      for (const file of files) {
        const stat = fs.lstatSync(path.join(__dirname, dir, file));
        if (stat.isDirectory()) {
          readCommands(path.join(dir, file));
        } else if (file !== handlerFile) {
          let category = path.basename(path.dirname(path.join(__dirname, dir, file)));
          const command = require(path.join(__dirname, dir, file));
          let { name, description = "", disabled = false, hidden = false } = command;

          if (!disabled && !hidden) {
            if (category === "owner" && !isOwner) return; // only show owner page to owner
            if (!(category in cmdlist)) {
              cmdlist[category] = [];
            }
            cmdlist[category].push(`**${name[0]}**: ${description}`);
          }
        }
      }
    };

    readCommands("../");

    if (isSlash ? !interaction.options.get("command")?.value : !args[0]) {
      await interaction.defer?.();

      const leftButton = new MessageButton().setEmoji("◀").setStyle("PRIMARY").setCustomId("left");
      const rightButton = new MessageButton().setEmoji("▶").setStyle("PRIMARY").setCustomId("right");
      const msgObject = () => {
        return {
          components: [{ type: 1, components: [leftButton, rightButton] }],
          embeds: [getGenericEmbed(currentPage)],
        };
      };

      const msg = isSlash ? await interaction.editReply(msgObject()) : await interaction.reply(msgObject());

      const filter = button => button.user.id === interaction.author.id;

      const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", button => {
        if (button.customId === "right") {
          currentPage++;
          currentPage = Math.min(currentPage, Object.keys(cmdlist).length - 1);
          button.update(msgObject());
        } else {
          currentPage--;
          currentPage = Math.max(currentPage, 0);
          button.update(msgObject());
        }
      });
    } else {
      let desiredCmd = isSlash ? interaction.options.get("command").value.toLowerCase() : args[0].toLowerCase();
      let embed = getDetailedEmbed(desiredCmd);
      if (embed) interaction.reply({ embeds: [embed] });
      else interaction.reply(`🚫 **\`${desiredCmd}\` is not a valid command.**`);
    }

    function getGenericEmbed(page) {
      var helpEmbed = new MessageEmbed();
      category = Object.keys(cmdlist)[page];
      arr = cmdlist[category];
      str = arr.join("\n");
      return helpEmbed
        .setColor("#f03e1f")
        .addFields({ name: `Showing ${category.toLowerCase()} commands`, value: str })
        .setFooter(`Page ${page + 1}/${Object.keys(cmdlist).length}`);
    }

    function getDetailedEmbed(cmd) {
      cmd = client.commands.find(command => command.name.includes(cmd));

      if (!cmd) return;

      const helpEmbed = new MessageEmbed();

      helpEmbed
        .setColor("#f03e1f")
        .setTitle(`Showing details for ${process.env.PREFIX}${cmd.name[0] || cmd.name}`)
        .addField("**Description**", cmd.description);

      if (cmd.usage) helpEmbed.addField("**Usage**", `\`${cmd.usage}\``, true);
      if (cmd.name.length > 1) helpEmbed.addField("**Aliases**", cmd.name.join(", "));
      if (cmd.required_perms)
        helpEmbed.addField("**Permissions required**", cmd.required_perms.map(cmd => `\`${cmd}\``).join(", "));

      return helpEmbed;
    }
  },
};
