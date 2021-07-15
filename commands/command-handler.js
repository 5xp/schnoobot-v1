const path = require("path");
const fs = require("fs");
const handlerFile = "command-handler.js";
const { getPrefix } = require("../utils/guildsettings");

module.exports = client => {
  client.commands = [];

  const readCommands = async dir => {
    const files = fs.readdirSync(path.join(__dirname, dir));
    for (const file of files) {
      const stat = fs.lstatSync(path.join(__dirname, dir, file));
      if (stat.isDirectory()) {
        readCommands(path.join(dir, file));
      } else if (file !== handlerFile && file.endsWith(".js")) {
        const command = require(path.join(__dirname, dir, file));
        let { name, required_perms = [] } = command;

        if (typeof name === "string") command.name = [name];
        if (typeof required_perms === "string") command.required_perms = [required_perms];
        client.commands.push(command);
      }
    }
  };

  readCommands("");

  client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const { member, content, guild } = message;
    const prefix = await getPrefix(guild?.id);

    if (content.startsWith(prefix)) {
      for (const command of client.commands) {
        let { name, description = "", usage = "", disabled = false, hidden = false, required_perms = [], execute } = command;

        for (const alias of name) {
          if (content.toLowerCase().split(" ")[0] === `${prefix}${alias.toLowerCase()}`) {
            for (const permission of required_perms) {
              // TODO: list missing permissions
              if (!member.permissions.has(permission)) {
                return message.reply(`missing permissions!`);
              }
            }

            if (disabled) {
              return message.reply("this command is disabled!");
            }

            const args = content.split(/[ ]+/);
            args.shift();

            execute(message, args, args.join(" "));
          }
        }
      }
    } else {
      // auto tiktok download
      const url = content.match(/https?:\/\/(vm.tiktok.com[^\s"]+|www.tiktok.com[^\s"]+)/);
      if (url) {
        return client.commands.find(cmd => cmd.name.includes("dl")).execute(message, [url[0]], true);
      }
    }
  });

  client.on("interactionCreate", interaction => {
    if (interaction.isCommand()) {
      client.commands.find(cmd => cmd.name.includes(interaction.commandName)).execute(interaction);
    }
  });
};
