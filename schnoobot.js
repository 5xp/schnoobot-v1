require("dotenv").config();
const Discord = require("discord.js");
const mongo = require("./mongo.js");
const fs = require("fs");
const colors = require("colors");
const helper = require("./helper.js");
const settingsSchema = require("./schemas/guildsettings-schema");

const client = new Discord.Client();
const globalprefix = process.env.PREFIX;

client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands/").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.once("ready", async () => {
  console.log(`Schnoobot is online!`.blue);
  await mongo().then(mongoose => {
    console.log(`Connected to mongo!`.green);
  });
});

//commands
client.on("message", async message => {
  let msg = message.content.toLowerCase();

  if (msg.includes("wbl") && !message.author.bot) {
    console.log(`Said wbl to ${message.author.username}`.bold.blue);
    message.channel.send("wbl");
  }

  // get guild prefix if it exists
  client.commands
    .get("prefix")
    .checkCache(message)
    .then(prefix => {
      if ((!message.content.startsWith(prefix) && !(message.mentions.users.size && message.mentions.users.first().id == client.user.id)) || message.author.bot || !message.guild) return;

      // if user mentions client
      const args = message.mentions.users.size ? message.content.replace(`<@!${message.mentions.users.first().id}> `, "").split(/ +/) : message.content.slice(prefix.length).split(/ +/);
      console.log(args);
      const command = args.shift().toLowerCase();

      for (c of client.commands) {
        if (command == c[0] || (c[1].alias !== undefined && Object.values(c[1].alias).includes(command))) {
          if (c[1].disabled !== undefined && c[1].disabled == true) {
            message.reply("that command is disabled!");
          } else {
            if (c[1].required_perms == undefined || c[1].required_perms.some(helper.CheckPermissions(message.member, c[1].required_perms))) {
              client.commands.get(c[0]).execute(message, args);
            } else {
              message.reply(`missing permission: \`${c[1].required_perms.join(", ")}\``);
            }
          }
        }
      }
    });
});

client.login(process.env.TOKEN);
