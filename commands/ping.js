module.exports = {
  name: "ping",
  description: "ping command",
  category: "Utility",
  execute(message, args) {
    message.reply("pong!");
  },
};
