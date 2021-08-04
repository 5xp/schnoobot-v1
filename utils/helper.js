const fs = require("fs");
const fetch = require("node-fetch");

async function findMember(query, interaction) {
  if (!query) return;

  const members = await interaction.guild.members.search({ query, limit: 1 });
  let member = members?.first();

  if (!member) {
    const matches = query.match(/^<@!?(\d+)>$/);
    if (!matches) return;
    member = interaction.guild.members.cache.get(matches[1]);
  }

  return member;
}

function findChannel(query, interaction) {
  if (!query) return;
  const matches = query?.match(/^<#(\d+)>$/);
  if (matches) return interaction.guild.channels.cache.get(matches[1]);
}

function findVoice(query, interaction) {
  if (!query) return;

  query = query.toLowerCase();

  // search cache with id
  let vc = interaction.guild.channels.cache.get(query);

  if (!vc) {
    const matches = query.match(/^<#(\d+)>$/);
    if (matches) {
      vc = interaction.guild.channels.cache.get(matches[1]);
    }
  }

  // search cache with name
  if (!vc) {
    vc = interaction.guild.channels.cache
      .filter(channel => channel.name.toLowerCase().includes(query) && channel.type === "GUILD_VOICE")
      .first();
  }
  return vc;
}

const downloadFile = async (url, path) => {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
};

const trunc = (number, decimals) => Math.trunc(number * Math.pow(10, decimals)) / Math.pow(10, decimals);

const randomRange = (min, max) => Math.random() * (max - min) + min;

module.exports = {
  findMember,
  findVoice,
  downloadFile,
  trunc,
  randomRange,
  findChannel,
};
