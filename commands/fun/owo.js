const owoify = require("owoify-js").default;
module.exports = {
  name: ["owo", "owoify", "uwu"],
  description: "owoify a message",
  execute(message, args, content) {
    message.channel.send(owoify(content, "uwu"));
  },
};
