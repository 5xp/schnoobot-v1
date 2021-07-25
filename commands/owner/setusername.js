const helper = require("@utils/helper.js");
module.exports = {
  name: "setusername",
  description: "set the name of the bot",
  execute(message, args) {
    if (message.author.id !== proccess.env.OWNERID) {
      message.reply("You must own the bot to change the avatar!");
      return;
    }
    if (!args) {
      message.reply("invalid arguments!");
      return;
    }

    let name = helper.JoinArgs(args);

    client = message.client;
    client.user
      .setUsername(name)
      .then(console.log(`${message.author.username} changed the bot's name!`.green))
      .catch(error => {
        message.reply(error.message);
      });
  },
};
