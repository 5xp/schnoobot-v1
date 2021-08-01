require("dotenv").config();
require("module-alias/register");
const colors = require("colors");
const mongoose = require("mongoose").set("useFindAndModify", false);
const { Client } = require("discord.js");
const mongo = require("@utils/mongo.js");
const { loadReminders } = require("@utils/reminder");

const client = new Client({
  intents: [
    "GUILDS",
    "GUILD_MEMBERS",
    "GUILD_VOICE_STATES",
    "GUILD_MESSAGES",
    "DIRECT_MESSAGES",
    "GUILD_EMOJIS_AND_STICKERS",
    "GUILD_MESSAGE_REACTIONS",
  ],
  partials: ["CHANNEL"],
});

client.once("ready", async () => {
  console.log(`Schnoobot is online!`.blue);
  if (!client.application?.owner) await client.application?.fetch();
  client.user.setActivity(`for ${process.env.PREFIX}`, { type: "WATCHING" });

  await mongo().then(mongoose => {
    console.log(`Connected to MongoDB!`.green);
  });

  const commandHandler = require(`@commands/command-handler.js`);
  commandHandler(client);
  loadReminders(client);
});

client.login(process.env.TOKEN);
