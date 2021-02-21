const fs = require("fs");
const request = require("request");

function FindUser(input, message) {
  let newInput = input.toLowerCase();
  let user = message.guild.members.cache.get(newInput);

  // try search cache with displayname
  if (!user) {
    user = message.guild.members.cache.filter(u => u.displayName.toLowerCase().includes(newInput)).first();
  }

  // try search cache with username
  if (!user) {
    user = message.guild.members.cache.filter(u => u.user.username.toLowerCase().includes(newInput)).first();
  }

  // try mention
  if (!user) {
    if (message.mentions.users.size) {
      user = message.guild.members.cache.get(message.mentions.users.first().id);
    }
  }

  // last resort - get id from regex
  if (!user) {
    let id = input.replace(/[\\<>@#&!]/g, "");
    user = message.client.users.cache.get(id) ? message.client.users.cache.get(id) : { id: id };
  }

  return user;
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

module.exports = {
  FindUser,
  FindVC,
  JoinArgs,
  DownloadFile,
  sanitizeString,
  CheckPermissions,
};
