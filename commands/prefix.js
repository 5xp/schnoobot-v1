const settingsSchema = require("../schemas/guildsettings-schema");
const helper = require("../helper");

module.exports = {
  name: "prefix",
  description: "set guild prefix",
  category: "Utility",
  required_perms: ["ADMINISTRATOR"],
  cache: {},
  async execute(message, args) {
    let newPrefix = helper.JoinArgs(args);
    if (args.length) {
      if (newPrefix == "reset") newPrefix = process.env.PREFIX;
      this.cache[message.guild.id] = newPrefix;
      await settingsSchema.findOneAndUpdate(
        {
          _id: message.guild.id,
        },
        {
          _id: message.guild.id,
          prefix: newPrefix,
        },
        {
          upsert: true,
        }
      );
      message.reply(`changed guild prefix to \`${newPrefix}\`!`);
    } else {
      // show current prefix
      this.checkCache(message).then(prefix => {
        message.reply(`your current prefix is \`${prefix}\`!`);
      });
    }
  },
  async checkCache(message) {
    let prefix = this.cache[message.guild.id];
    if (!prefix) {
      const result = await settingsSchema.findOne({ _id: message.guild.id });
      localprefix = result ? result.prefix : process.env.PREFIX;
      this.cache[message.guild.id] = prefix = localprefix;
    }
    return prefix;
  },
};
