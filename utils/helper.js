const fs = require("fs");
const fetch = require("node-fetch");

function FindMember(input, message) {
  let newInput = input.toLowerCase();
  let member = message.guild.members.cache.get(newInput);

  // try search cache with displayname
  if (!member) {
    member = message.guild.members.cache.filter(u => u.displayName.toLowerCase().includes(newInput)).first();
  }

  // try search cache with username
  if (!member) {
    member = message.guild.members.cache.filter(u => u.user.username.toLowerCase().includes(newInput)).first();
  }

  // try mention
  if (!member) {
    const matches = input.match(/^<@!?(\d+)>$/);
    if (!matches) return;
    member = message.guild.members.cache.get(matches[1]);
  }

  return member;
}

function FindVC(input, message) {
  // search cache with id
  let vc = message.guild.channels.cache.get(input);

  if (!vc) {
    const matches = input.match(/^<#(\d+)>$/);
    if (matches) {
      vc = message.guild.channels.cache.get(matches[1]);
    }
  }

  // search cache with name
  if (!vc) {
    vc = message.guild.channels.cache.filter(channel => channel.name.toLowerCase().includes(input) && channel.type === "voice").first();
  }
  return vc;
}

function JoinArgs(args) {
  newArgs = args.length > 1 ? args.join(" ") : args;
  return String(newArgs);
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

function sanitizeString(str) {
  str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, "");
  return str.trim();
}

function CheckPermissions(user, permission) {
  return (hasPermission = permission => user.hasPermission(permission));
}

TruncateDecimals = (number, decimals) => Math.trunc(number * Math.pow(10, decimals)) / Math.pow(10, decimals);

RandomRange = (min, max) => Math.random() * (max - min) + min;

function TimeToString(ms) {
  hours = Math.floor(ms / 60000 / 60);
  minutes = Math.floor((ms / 60000) % 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  else if (hours > 0 && minutes == 0) return `${hours}h`;
  else return `${minutes}m`;
}

module.exports = {
  FindMember,
  FindVC,
  JoinArgs,
  downloadFile,
  sanitizeString,
  CheckPermissions,
  TruncateDecimals,
  RandomRange,
  TimeToString,
};
