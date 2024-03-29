module.exports = {
  name: "setavatar",
  description: "set the avatar of the bot",
  async execute(message, args) {
    if (message.author.id !== process.env.OWNERID) {
      return;
    }

    let avatar;
    if (message.attachments.first()) avatar = message.attachments.first().url;
    else if (args[0]) avatar = args[0];
    else {
      message.reply("invalid arguments!");
      return;
    }

    client = message.client;
    client.user
      .setAvatar(avatar)
      .then(console.log(`${message.author.username} changed the bot's avatar!`.green))
      .catch(error => {
        message.reply(error.message);
      });
  },
};
