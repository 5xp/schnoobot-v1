module.exports = {
  name: "ping",
  description: "ping command",
  slash: true,
  execute(message, args) {
    message.reply("pong!");
  },
};
