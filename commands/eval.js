const helper = require("../utils/helper.js");
module.exports = {
  name: "eval",
  description: "eval",
  category: "Bot owner",
  async execute(message, args) {
    if (message.author.id !== process.env.OWNERID) {
      return;
    }
    try {
      let code = helper.JoinArgs(args);
      let evaled = await eval(code);
      if (typeof evaled !== "string") evaled = require("util").inspect(evaled);
      message.channel.send(clean(evaled), { code: "xl" });
    } catch (err) {
      message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
  },
};
function clean(text) {
  if (typeof text === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else return text;
}
