const Discord = require("discord.js");
const fs = require("fs");
const config = require("./config");
const colors = require("colors");

const client = new Discord.Client();
const prefix = "*";

client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands/").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.once("ready", () => {
  console.log(`Schnoobot is online!`.blue);
});

//commands
client.on("message", message => {
  let msg = message.content.toLowerCase();

  if (msg.includes("wbl") && !message.author.bot) {
    console.log(`Said wbl to ${message.author.username}`.bold.blue);
    message.channel.send("wbl");
  }

  if (!message.content.startsWith(prefix) || message.author.bot || !message.guild) return;

  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();

  for (c of client.commands) {
    if (command == c[0] || (c[1].alias !== undefined && Object.values(c[1].alias).includes(command))) {
      if (c[1].disabled !== undefined && c[1].disabled == true) {
        message.reply("that command is disabled!");
      } else {
        client.commands.get(c[0]).execute(message, args);
      }
    }
  }
});

client.login(config.token);
