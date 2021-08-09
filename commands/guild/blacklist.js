const fs = require("fs");
const path = require("path");
const { setBlacklist, getBlacklist } = require("@utils/guildsettings");
const { findChannel } = require("@utils/helper");
const { MessageEmbed } = require("discord.js");

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
    const { client, options, guild } = interaction;
    const isSlash = interaction.isCommand?.();
    const subCommand = interaction?.options?.getSubcommand();

    // /blacklist list || !blacklist
    try {
      if (isSlash ? subCommand === "list" : !args.length) {
        const blData = await getBlacklist(guild.id);
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
          .setTitle(`${guild.name}'s blacklist`)
          .setColor("DARK_RED")
          .addFields(fields);

        if (completelyBlacklisted.length) {
          listEmbed.addField("Blacklisted from guild", completelyBlacklisted.join(", "));
        }

        if (!completelyBlacklisted.length && !fields.length) {
          return interaction.reply({ content: "⚠ **This server's blacklist is empty.**", ephemeral: true });
        }

        interaction.reply({ embeds: [listEmbed], ephemeral: true });
      } else {
        let input, channel, res;
        if (isSlash) {
          input = options.getString(subCommand).toLowerCase();

          if (subCommand === "command") input = client.commands.findKey(command => command.name.includes(input));

          if (subCommand === "command" && !input) {
            throw new Error(`🚫 **\`${options.getString(subCommand)}\` is not a valid command.**`);
          }

          channel = options.getChannel("channel");

          if (channel?.isText() || channel === null) {
            res = await setBlacklist(guild.id, { input, channel: channel?.id ?? null });
          } else {
            throw new Error(`🚫 **<#${channel.id}> is not a valid text channel.**`);
          }
        } else {
          input = args[0];

          const command = client.commands.findKey(cmd => cmd.name.includes(input));
          const category = client.commands.find(cmd => cmd.category === input)?.category;

          input = category ?? command;

          if (!command && !category) {
            throw new Error(`🚫 **\`${args[0]}\` is not a valid category or command.**`);
          }

          channel = findChannel(args?.[1], interaction) ?? null;

          if (channel?.isText() || channel === null) {
            res = await setBlacklist(guild.id, { input, channel: channel?.id ?? null });
          } else {
            throw new Error(`🚫 **<#${channel.id}> is not a valid text channel.**`);
          }
        }

        if (res) {
          const str = channel
            ? `✅ **Added \`${input}\` to ${channel} blacklist!**`
            : `✅ **Added \`${input}\` to blacklist!**`;
          interaction.reply({ content: str, ephemeral: true });
        } else {
          const str = channel
            ? `✅ **Removed \`${input}\` from ${channel} blacklist!**`
            : `✅ **Removed \`${input}\` from blacklist!**`;
          interaction.reply({ content: str, ephemeral: true });
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
