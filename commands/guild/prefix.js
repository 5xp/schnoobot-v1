const { setPrefix, getPrefix } = require("@utils/guildsettings");

module.exports = {
  name: "prefix",
  description: "set guild prefix",
  required_perms: ["ADMINISTRATOR"],
  usage: `${process.env.PREFIX}prefix <new prefix>\n${process.env.PREFIX}prefix\n${process.env.PREFIX}prefix reset`,
  async execute(message, args, content) {
    let newPrefix = content;
    if (args.length) {
      if (newPrefix == "reset") await setPrefix(message.guild.id, null);
      else await setPrefix(message.guild.id, newPrefix);
      message.reply(`changed guild prefix to \`${newPrefix}\`!`);
    } else {
      message.reply(`your current prefix is \`${await getPrefix(message.guild.id)}\`!`);
    }
  },
};
