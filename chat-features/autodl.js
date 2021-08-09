const { getURLs } = require("@utils/guildsettings");

module.exports = async function (message) {
  const { guild } = message;
  const { execute } = message.client.commands.get("dl");

  if (!guild) return;

  const urlList = await getURLs(guild.id);

  for (const url of urlList) {
    const re = new RegExp(url + "[^\\s]+");
    const dlURL = message.content.match(re);

    if (dlURL) {
      execute(message, [dlURL[0]], true);
      break;
    }
  }
};
