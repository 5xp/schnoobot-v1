const helper = require("../helper.js");
module.exports = {
  name: "steal",
  description: "steal an emoji",
  alias: ["emoji"],
  category: "Utility",
  required_perms: ["MANAGE_EMOJIS"],
  execute(message, args) {
    let attachment = message.attachments.first();

    if ((!args[0] || !args[1]) && (!attachment || !args[0])) {
      message.reply("missing arguments!");
      return;
    }

    let url = args[0] && !attachment ? args[0].replace(/[<>]/g, "") : attachment.url;
    let name = args[0] && !attachment ? args[1] : args[0];

    message.guild.emojis
      .create(url, name)
      .then(emoji => {
        console.log(`${message.author.username} created emoji ${emoji.name} in guild ${message.guild.name}`.green);
        message.channel.send(`Created ${emoji}!`);
      })
      .catch(error => {
        console.error(error);
        message.reply(error.message);
      });
  },
};
