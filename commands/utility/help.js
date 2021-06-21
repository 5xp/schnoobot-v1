const Discord = require("discord.js");
const fs = require("fs");
const path = require("path");
const handlerFile = "command-handler.js";

module.exports = {
  name: ["help", "h"],
  description: "help",
  usage: `${process.env.PREFIX}help <command?>`,
  category: "Utility",
  async execute(message, args) {
    let { client } = message;
    // let cmdlist = { Utility: [], Fun: [], "Guild settings": [], "Bot owner": [] };
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
            if (category === "owner" && message.author.id !== process.env.OWNERID) return; // only show owner page to owner
            if (!(category in cmdlist)) {
              cmdlist[category] = [];
            }
            cmdlist[category].push(`**${name[0]}**: ${description}`);
          }
        }
      }
    };

    readCommands("../");

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
          currentPage = Math.min(currentPage, Object.keys(cmdlist).length - 1);
          msg.edit(GetEmbedGeneric(currentPage));
        } else {
          currentPage--;
          currentPage = Math.max(currentPage, 0);
          msg.edit(GetEmbedGeneric(currentPage));
        }
        RemoveReactions(msg, message.author.id);
      });
    } else {
      let desiredCmd = args[0].toLowerCase();
      let embed = GetEmbedSpecific(desiredCmd);
      if (embed !== undefined) message.channel.send(embed);
      else message.reply("invalid arguments!");
    }

    function GetEmbedGeneric(page) {
      var helpEmbed = new Discord.MessageEmbed();
      category = Object.keys(cmdlist)[page];
      arr = cmdlist[category];
      str = arr.join("\n");
      return helpEmbed
        .setColor("#f03e1f")
        .addFields({ name: `Showing ${category.toLowerCase()} commands`, value: str })
        .setFooter(`Page ${page + 1}/${Object.keys(cmdlist).length}`);
    }

    function GetEmbedSpecific(cmd) {
      cmd = client.commands.filter(command => {
        return command.name.includes(cmd);
      })[0];
      // cmd = client.commands.get(cmd);
      if (cmd == undefined) return undefined;
      var helpEmbed = new Discord.MessageEmbed();
      helpEmbed
        .setColor("#f03e1f")
        .setTitle(`Showing details for ${process.env.PREFIX}${cmd.name[0] || cmd.name}`)
        .setDescription(cmd.description);
      if (cmd.usage) helpEmbed.addField("**Usage**", `\`${cmd.usage}\``, true);
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
