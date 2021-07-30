const settingsSchema = require("@schemas/guildsettings-schema");
const prefixCache = new Map();
const urlCache = new Map();
const blacklistCache = new Map();

async function getPrefix(guildId) {
  if (prefixCache.has(guildId)) return prefixCache.get(guildId);

  const res = await settingsSchema.findById(guildId);
  if (!res || !res.prefix) {
    prefixCache.set(guildId, process.env.PREFIX);
    return process.env.PREFIX;
  } else {
    prefixCache.set(guildId, res.prefix);
    return res.prefix;
  }
}

async function setPrefix(guildId, prefix) {
  if (prefixCache.has(guildId)) {
    if (prefixCache.get(guildId) === prefix) return;
  }

  if (prefix === null || prefix === process.env.PREFIX) {
    await settingsSchema.findByIdAndUpdate(guildId, {
      $unset: { prefix: "" },
    });
    prefixCache.delete(guildId);
    return;
  }

  await settingsSchema.findByIdAndUpdate(
    guildId,
    {
      prefix,
    },
    {
      upsert: true,
    }
  );
  prefixCache.set(guildId, prefix);
  return;
}

async function addURL(guildId, url) {
  if (urlCache.has(guildId)) {
    if (urlCache.get(guildId).includes(url)) {
      return;
    }
  }

  const res = await settingsSchema.findByIdAndUpdate(
    guildId,
    {
      $addToSet: { autodl: url },
    },
    {
      upsert: true,
    }
  );

  // make sure the url wasn't already in the db
  const success = !res.autodl.includes(url);

  if (success) res.autodl.push(url);
  urlCache.set(guildId, res.autodl);

  if (success) return urlCache.get(guildId);
  else throw { message: `\`${url}\` is already in the URL list.`, urls: urlCache.get(guildId) };
}

async function removeURL(guildId, url) {
  const res = await settingsSchema.findByIdAndUpdate(guildId, {
    $pull: { autodl: url },
  });

  // make sure the url was already in the db
  const success = res.autodl.includes(url);

  if (success) res.autodl.splice(res.autodl.indexOf(url), 1);

  urlCache.set(guildId, res.autodl);

  if (success) return urlCache.get(guildId);
  else throw { message: `\`${url}\` was not found in the URL list.`, urls: urlCache.get(guildId) };
}

async function getURLs(guildId) {
  if (urlCache.has(guildId)) {
    return urlCache.get(guildId);
  } else {
    const res = await settingsSchema.findById(guildId);
    const list = res?.autodl ?? [];
    urlCache.set(guildId, list);
    return list;
  }
}

async function setBlacklist(guildId, data) {
  const { input, channel } = data;
  const blacklist = await getBlacklist(guildId);
  if (blacklist[input]?.includes(channel)) {
    removeBlacklist(guildId, data);
    return false;
  } else {
    addBlacklist(guildId, data);
    return true;
  }
}

async function getBlacklist(guildId) {
  if (blacklistCache.has(guildId)) {
    return blacklistCache.get(guildId);
  } else {
    const res = await settingsSchema.findById(guildId);
    if (res?.blacklist) blacklistCache.set(guildId, res.blacklist);
    else blacklistCache.set(guildId, []);
    return blacklistCache.get(guildId);
  }
}

async function addBlacklist(guildId, data) {
  const { input, channel } = data;
  const res = await settingsSchema.findByIdAndUpdate(
    guildId,
    {
      $addToSet: { [`blacklist.${input}`]: channel },
    },
    { upsert: true, new: true }
  );
  blacklistCache.set(guildId, res.blacklist);
}

async function removeBlacklist(guildId, data) {
  const { input, channel } = data;
  const res = await settingsSchema.findByIdAndUpdate(
    guildId,
    {
      $pull: { [`blacklist.${input}`]: channel },
    },
    { upsert: true, new: true }
  );
  blacklistCache.set(guildId, res.blacklist);
}

async function checkBlacklisted(interaction, command) {
  const { guild, channel } = interaction;
  const { name, category } = command;
  const blacklist = await getBlacklist(guild.id);

  if (category === "guild") return false;

  if (name[0] in blacklist) {
    if (blacklist[name[0]].includes(channel.id) || blacklist[name[0]].includes(null)) return true;
  }
  if (category in blacklist) {
    if (blacklist[category].includes(channel.id) || blacklist[category].includes(null)) return true;
  }
  return false;
}

module.exports = {
  getPrefix,
  setPrefix,
  addURL,
  removeURL,
  getURLs,
  setBlacklist,
  getBlacklist,
  checkBlacklisted,
};
