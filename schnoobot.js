require("dotenv").config();
const colors = require("colors");
const mongoose = require("mongoose");
const { Client } = require("discord.js");
const mongo = require("./utils/mongo.js");
const { HandleCoin } = require("./utils/coin");

const client = new Client({ intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "DIRECT_MESSAGES", "GUILD_EMOJIS", "GUILD_MESSAGE_REACTIONS"], partials: ["CHANNEL"] });

client.once("ready", async () => {
  console.log(`Schnoobot is online!`.blue);
  if (!client.application?.owner) await client.application?.fetch();
  client.user.setActivity(`for ${process.env.PREFIX}`, { type: "WATCHING" });

  const commandHandler = require(`./commands/command-handler.js`);

  commandHandler(client);

  await mongo().then(mongoose => {
    console.log(`Connected to mongo!`.green);
  });

  HandleCoin(client);
});

client.login(process.env.TOKEN);
