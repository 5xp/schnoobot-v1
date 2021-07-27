const path = require("path");
const fs = require("fs");
const handlerFile = "command-handler.js";
const { getPrefix, getURLs } = require("@utils/guildsettings");

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
        let { name, disabled = false, required_perms = [], execute } = command;

        for (const alias of name) {
          if (content.toLowerCase().split(" ")[0] === `${prefix}${alias.toLowerCase()}`) {
            const missing_perms = required_perms.filter(permission => !member.permissions.has(permission));
            if (missing_perms.length) {
              return message.reply({
                content: `You are missing permissions: ${missing_perms.map(p => `\`${p}\``).join(", ")}`,
              });
            }

            if (disabled) {
              return message.reply("This command is disabled!");
            }

            const args = content.split(/[ ]+/);
            args.shift();

            execute(message, args, args.join(" "));
          }
        }
      }
    } else {
      // auto download
      const { execute } = require("@commands/utility/dl");
      const urlList = await getURLs(guild.id);

      for (const url of urlList) {
        const re = new RegExp(url + "[^\\s]+");
        const dlURL = content.match(re);
        if (dlURL) {
          execute(message, [dlURL[0]], true);
          break;
        }
      }
    }
  });

  client.on("interactionCreate", interaction => {
    if (interaction.isCommand()) {
      const command = client.commands.find(cmd => cmd.name.includes(interaction.commandName));
      let { disabled = false, required_perms = [], execute } = command;

      const missing_perms = required_perms.filter(permission => !interaction.member.permissions.has(permission));
      if (missing_perms.length) {
        return interaction.reply({
          content: `You are missing permissions: ${missing_perms.map(p => `\`${p}\``).join(", ")}`,
          ephemeral: true,
        });
      }

      if (disabled) return interaction.reply({ content: "This command is disabled!", ephemeral: true });

      execute(interaction);
    }
  });
};
