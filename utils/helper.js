const fs = require("fs");
const request = require("request");

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

  // search cache with name
  if (vc == null) {
    vc = message.guild.channels.cache.filter(channel => channel.name.toLowerCase().includes(input) && channel.type === "voice").first();
  }
  return vc;
}

function JoinArgs(args) {
  newArgs = args.length > 1 ? args.join(" ") : args;
  return String(newArgs);
}

const DownloadFile = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on("close", callback);
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
  minutes = Math.floor((ms / 60000) % 60);
  hours = Math.floor(ms / 60000 / 60);
  console.log(hours);
  console.log(minutes);
  hours = hours ? `${hours} hours and ` : "";
  minutes = minutes ? `${minutes} minutes` : "";
  return `${hours}${minutes}`;
}

module.exports = {
  FindMember,
  FindVC,
  JoinArgs,
  DownloadFile,
  sanitizeString,
  CheckPermissions,
  TruncateDecimals,
  RandomRange,
  TimeToString,
};
