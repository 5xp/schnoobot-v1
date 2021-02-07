module.exports = {
  name: "steal",
  description: "steal an emoji",
  aliases: ["emoji"],
  execute(message, args) {
    if (!message.member.hasPermission("MANAGE_EMOJIS")) {
      message.reply("insufficient permissions to create emojis!").then(console.log(`${message.author.username} attempted ${this.name} with insufficient permissions!`.red));
    }

    if (!args[0] || !args[1]) {
      message.reply("missing arguments!");
      return;
    }

    message.guild.emojis
      .create(args[0], args[1])
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
