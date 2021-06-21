require("dotenv").config();
const colors = require("colors");
const mongoose = require("mongoose");
const Discord = require("discord.js");
const mongo = require("./utils/mongo.js");
const { HandleCoin } = require("./utils/coin");

const client = new Discord.Client();

client.once("ready", async () => {
  console.log(`Schnoobot is online!`.blue);

  const commandHandler = require(`./commands/command-handler.js`);

  commandHandler(client);

  await mongo().then(mongoose => {
    console.log(`Connected to mongo!`.green);
  });

  HandleCoin(client);
});

client.login(process.env.TOKEN);
