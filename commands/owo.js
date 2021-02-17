const helper = require("../helper.js");
const owoify = require("owoify-js").default;
module.exports = {
  name: "owo",
  description: "owoify a message",
  alias: ["owoify", "uwu"],
  category: "Fun",
  execute(message, args) {
    message.channel.send(owoify(helper.JoinArgs(args), "uwu"));
  },
};
