const path = require("path");
const fs = require("fs");
const handlerFile = "command-handler.js";
const { getPrefix, checkBlacklisted } = require("@utils/guildsettings");
const colors = require("colors");
const { Collection } = require("discord.js");

module.exports = client => {
  client.commands = new Collection();
  client.features = new Collection();

  // recursively read js files in each folder
  const readFiles = async (dir, collection) => {
    const files = fs.readdirSync(path.join(__dirname, dir));
    for (const file of files) {
      const stat = fs.lstatSync(path.join(__dirname, dir, file));
      if (stat.isDirectory()) {
        readFiles(path.join(dir, file), collection);
      } else if (file !== handlerFile && file.endsWith(".js")) {
        const command = require(path.join(__dirname, dir, file));
        let { name, required_perms = [] } = command;

        const category = path.basename(path.dirname(path.join(__dirname, dir, file)));
        command.category = category;

        if (typeof name === "string") command.name = [name];
        if (typeof required_perms === "string") command.required_perms = [required_perms];
        collection.set(command.name[0] ?? file, command);
      }
    }
  };

  readFiles("", client.commands);
  readFiles("../chat-features", client.features);

  client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const { member, content, guild } = message;
    const prefix = guild ? await getPrefix(guild) : process.env.PREFIX;

    if (content.startsWith(prefix)) {
      for (const command of client.commands.values()) {
        let { name, disabled = false, required_perms = [], execute } = command;

        for (const alias of name) {
          if (content.toLowerCase().split(" ")[0] === `${prefix}${alias.toLowerCase()}`) {
            const missing_perms = required_perms.filter(permission => !member.permissions.has(permission));
            if (missing_perms.length) {
              return message.reply({
                content: `⚠ **You are missing permissions: ${missing_perms.map(p => `\`${p}\``).join(", ")}**`,
              });
            }

            if (disabled) {
              return message.reply("⚠ **This command is disabled.**");
            }

            if (await checkBlacklisted(message, command))
              return message.reply("⚠ **This command cannot be used in this channel.**");

            const args = content.split(/[ ]+/);
            args.shift();

            const currentTime = new Date().toTimeString().split(" ")[0];
            console.log(`[${currentTime}] ${message.author.tag} used !${alias} ${args.join(" ")}`.yellow);

            execute(message, args, args.join(" "));
          }
        }
      }
    } else {
      for (const feature of client.features.values()) {
        feature(message);
      }
    }
  });

  client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
      const command = client.commands.find(cmd => cmd.name.includes(interaction.commandName));
      let { name, disabled = false, required_perms = [], execute } = command;

      const missing_perms = required_perms.filter(permission => !interaction.member.permissions.has(permission));
      if (missing_perms.length) {
        return interaction.reply({
          content: `⚠ **You are missing permissions: ${missing_perms.map(p => `\`${p}\``).join(", ")}**`,
          ephemeral: true,
        });
      }

      if (disabled) return interaction.reply({ content: "⚠ **This command is disabled.**", ephemeral: true });

      if (await checkBlacklisted(interaction, command))
        return interaction.reply({ content: "⚠ **This command cannot be used in this channel.**", ephemeral: true });

      const currentTime = new Date().toTimeString().split(" ")[0];
      const options = interaction.options._hoistedOptions.map(option => `${option.name}: ${option.value}`);
      console.log(`[${currentTime}] ${interaction.user.tag} used /${name[0]} ${options.join(", ")}`.yellow);

      execute(interaction);
    }
  });
};
