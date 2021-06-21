const path = require("path");
const fs = require("fs");
const handlerFile = "command-handler.js";
const { getPrefix } = require("../utils/guildsettings");

module.exports = client => {
  client.commands = [];

  const readCommands = dir => {
    const files = fs.readdirSync(path.join(__dirname, dir));
    for (const file of files) {
      const stat = fs.lstatSync(path.join(__dirname, dir, file));
      if (stat.isDirectory()) {
        readCommands(path.join(dir, file));
      } else if (file !== handlerFile) {
        const command = require(path.join(__dirname, dir, file));
        let { name, description = "", usage = "", disabled = false, hidden = false, permissions = [], execute } = command;

        if (typeof name === "string") command.name = [name];
        if (typeof permissions === "string") command.permissions = [permissions];
        client.commands.push(command);
      }
    }
  };

  readCommands("");

  client.on("message", async message => {
    const { member, content, guild } = message;
    const prefix = await getPrefix(guild.id);

    for (const command of client.commands) {
      let { name, description = "", usage = "", disabled = false, hidden = false, permissions = [], execute } = command;

      for (const alias of name) {
        if (content.toLowerCase().split(" ")[0] === `${prefix}${alias.toLowerCase()}`) {
          for (const permission of permissions) {
            // TODO: list missing permissions
            if (!member.hasPermission(permission)) {
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
  });
};
