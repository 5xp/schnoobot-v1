const fs = require("fs");
const path = require("path");
const { setBlacklist, getBlacklist } = require("@utils/guildsettings");
const { findChannel } = require("@utils/helper");
const { MessageEmbed, Formatters } = require("discord.js");

module.exports = {
  name: ["blacklist", "bl"],
  description: "blacklist a category or command",
  required_perms: "MANAGE_SERVER",
  slash: true,
  usage: `${process.env.PREFIX}blacklist <category/command> <#channel>`,
  options: [
    { name: "list", type: "SUB_COMMAND", description: "list the blacklisted channels and commands" },
    {
      name: "category",
      type: "SUB_COMMAND",
      description: "blacklist a specific category",
      options: [
        {
          name: "category",
          description: "the category to blacklist",
          type: "STRING",
          required: true,
          choices: getCategoryChoices(),
        },
        {
          name: "channel",
          description: "the channel to blacklist (leave blank to blacklist completely)",
          type: "CHANNEL",
          required: false,
        },
      ],
    },
    {
      name: "command",
      type: "SUB_COMMAND",
      description: "blacklist a specific command",
      options: [
        {
          name: "command",
          description: "the command to blacklist",
          type: "STRING",
          required: true,
        },
        {
          name: "channel",
          description: "the channel to blacklist (leave blank to blacklist completely)",
          type: "CHANNEL",
          required: false,
        },
      ],
    },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();
    const commandArray = interaction.client.commands.map(command => command.name[0]);
    const categoryArray = getCategoryArray();
    const subCommand = interaction?.options?.getSubCommand();

    // /blacklist list || !blacklist
    try {
      if (isSlash ? subCommand === "list" : !args.length) {
        const blData = await getBlacklist(interaction.guild.id);
        const fields = [];
        const completelyBlacklisted = [];

        for (const key in blData) {
          if (!blData[key].length) continue;
          if (blData[key].includes(null)) {
            completelyBlacklisted.push(key);
          } else {
            fields.push({ name: key, value: blData[key].map(el => `<#${el}>`).join(", "), inline: true });
          }
        }

        const listEmbed = new MessageEmbed()
          .setTitle(`${interaction.guild.name}'s blacklist`)
          .setColor("DARK_RED")
          .addFields(fields);

        if (completelyBlacklisted.length)
          listEmbed.addField("Completely blacklisted commands or categories", completelyBlacklisted.join(", "));

        interaction.reply({ embeds: [listEmbed] });
      } else {
        let input, channel, res;
        if (isSlash) {
          input = interaction.options.getString(subCommand).toLowerCase();

          if (subCommand === "command" && !commandArray.includes(input)) {
            throw new Error(`🚫 **\`${input}\` is not a valid command.**`);
          }

          channel = interaction.options.getChannel("channel");

          if (channel?.isText() || channel === null)
            res = await setBlacklist(interaction.guild.id, { input, channel: channel?.id ?? null });
          else throw new Error(`🚫 **<#${channel.id}> is not a valid text channel.**`);
        } else {
          input = args[0];

          if (!commandArray.concat(categoryArray).includes(input)) {
            throw new Error(`🚫 **\`${input}\` is not a valid category or command.**`);
          }

          channel = findChannel(args?.[1], interaction) ?? null;

          if (channel?.isText() || channel === null)
            res = await setBlacklist(interaction.guild.id, { input, channel: channel?.id ?? null });
          else throw new Error(`🚫 **<#${channel.id}> is not a valid text channel.**`);
        }

        if (res) {
          const str = channel
            ? `✅ **Added \`${input}\` to ${channel} blacklist!**`
            : `✅ **Added \`${input}\` to blacklist!**`;
          interaction.reply(str);
        } else {
          const str = channel
            ? `✅ **Removed \`${input}\` from ${channel} blacklist!**`
            : `✅ **Removed \`${input}\` from blacklist!**`;
          interaction.reply(str);
        }
      }
    } catch (error) {
      interaction.reply({ content: error.message, ephemeral: true });
    }
  },
};

function getCategoryArray() {
  const files = fs.readdirSync(path.join(process.cwd(), "commands"));

  const categories = files.filter(
    file => fs.lstatSync(path.join(process.cwd(), "commands", file)).isDirectory() && file !== "owner"
  );
  return categories;
}

function getCategoryChoices() {
  const categories = getCategoryArray();
  const choices = categories.map(category => {
    return { name: category, value: category };
  });

  return choices;
}
