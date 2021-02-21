const helper = require("../utils/helper.js");
module.exports = {
  name: "setpresence",
  description: "set the presence of the bot",
  category: "Bot owner",
  execute(message, args) {
    if (message.author.id !== process.env.OWNERID) {
      message.reply("You must own the bot to change the avatar!");
      return;
    }
    if (!args) {
      message.reply("invalid arguments!");
      return;
    }

    const type = args.shift();

    if (args) str = helper.JoinArgs(args);
    else str = "";

    client = message.client;
    client.user
      .setActivity(`${str}`, { type: `${type}`.toUpperCase() })
      .then(console.log(`${message.author.username} changed the bot's presence!`.green))
      .catch(error => {
        message.reply(error.message);
      });
  },
};
