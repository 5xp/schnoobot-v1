const Discord = require("discord.js");
const config = require("../config.js");

module.exports = {
  name: "help",
  description: "help",
  alias: ["h"],
  usage: `\`${config.prefix}help <optional command>\``,
  category: "Utility",
  async execute(message, args) {
    let client = message.client;
    let cmdlist = { Utility: [], Fun: [], "Bot owner": [] };
    let currentPage = 0;

    for (c of client.commands) {
      let cmd = c[1];
      if (cmd.disabled == undefined || !cmd.disabled) {
        //map.push(cmd.category, [`**${cmd.name}**: ${cmd.description}`]);
        cmdlist[cmd.category].push([`**${cmd.name}**: ${cmd.description}`]);
        //map.set(cmd.category, map.get(cmd.category).push([`**${cmd.name}**: ${cmd.description}`]));
      }
    }

    if (!args[0]) {
      const msg = await message.channel.send(GetEmbedGeneric(currentPage));
      msg.react("◀").then(() => msg.react("▶"));

      const filter = (reaction, user) => {
        return ["◀", "▶"].includes(reaction.emoji.name) && user.id === message.author.id;
      };

      const collector = msg.createReactionCollector(filter, { time: 30000 });

      collector.on("collect", (reaction, user) => {
        if (reaction.emoji.name == "▶") {
          currentPage++;
          currentPage = Math.min(currentPage, 2);
          msg.edit(GetEmbedGeneric(currentPage));
        } else {
          currentPage--;
          currentPage = Math.max(currentPage, 0);
          msg.edit(GetEmbedGeneric(currentPage));
        }
        RemoveReactions(msg, message.author.id);
      });
    } else {
      let desiredCmd = args[0];
      const msg = await message.channel.send(GetEmbedSpecific(desiredCmd));
    }

    function GetEmbedGeneric(page) {
      var helpEmbed = new Discord.MessageEmbed();
      category = Object.keys(cmdlist)[page];
      arr = cmdlist[category];
      str = arr.join("\n");
      return helpEmbed
        .setColor("#f03e1f")
        .addFields({ name: `Showing ${category.toLowerCase()} commands`, value: str })
        .setFooter(`Page ${page + 1}/3`);
    }

    function GetEmbedSpecific(cmd) {
      cmd = client.commands.get(cmd);
      var helpEmbed = new Discord.MessageEmbed();
      helpEmbed.setColor("#f03e1f").setTitle(`Showing details for ${config.prefix}${cmd.name}`).setDescription(cmd.description);
      if (cmd.usage) helpEmbed.addField("**Usage**", cmd.usage, true);
      if (cmd.alias) helpEmbed.addField("**Aliases**", cmd.alias.join(", "));
      if (cmd.required_perms) helpEmbed.addField("**Permissions required**", cmd.required_perms.join(", "));

      return helpEmbed;
    }

    async function RemoveReactions(message, id) {
      const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(id));
      try {
        for (const reaction of userReactions.values()) {
          await reaction.users.remove(id);
        }
      } catch (error) {
        console.error("Failed to remove reactions.");
      }
    }
  },
};
