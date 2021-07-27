const settingsSchema = require("@schemas/guildsettings-schema");
const prefixCache = new Map();
const urlCache = new Map();

async function getPrefix(id) {
  if (prefixCache.has(id)) return prefixCache.get(id);

  const result = await settingsSchema.findById(id);
  if (!result || !result.prefix) {
    prefixCache.set(id, process.env.PREFIX);
    return process.env.PREFIX;
  } else {
    prefixCache.set(id, result.prefix);
    return result.prefix;
  }
}

async function setPrefix(id, prefix) {
  if (prefixCache.has(id)) {
    if (prefixCache.get(id) === prefix) return;
  }

  if (prefix === null || prefix === process.env.PREFIX) {
    await settingsSchema.findByIdAndUpdate(id, {
      $unset: { prefix: "" },
    });
    prefixCache.delete(id);
    return;
  }

  await settingsSchema.findByIdAndUpdate(
    id,
    {
      prefix,
    },
    {
      upsert: true,
    }
  );
  prefixCache.set(id, prefix);
  return;
}

async function addURL(id, url) {
  if (urlCache.has(id)) {
    if (urlCache.get(id).includes(url)) {
      return;
    }
  }

  const data = await settingsSchema.findByIdAndUpdate(
    id,
    {
      $addToSet: { autodl: url },
    },
    {
      upsert: true,
    }
  );

  // make sure the url wasn't already in the db
  const success = !data.autodl.includes(url);

  if (success) data.autodl.push(url);
  urlCache.set(id, data.autodl);

  if (success) return urlCache.get(id);
  else throw { message: `\`${url}\` is already in the URL list.`, urls: urlCache.get(id) };
}

async function removeURL(id, url) {
  const data = await settingsSchema.findByIdAndUpdate(id, {
    $pull: { autodl: url },
  });

  // make sure the url was already in the db
  const success = data.autodl.includes(url);

  if (success) data.autodl.splice(data.autodl.indexOf(url), 1);

  urlCache.set(id, data.autodl);

  if (success) return urlCache.get(id);
  else throw { message: `\`${url}\` was not found in the URL list.`, urls: urlCache.get(id) };
}

async function getURLs(id) {
  if (urlCache.has(id)) {
    return urlCache.get(id);
  } else {
    const data = await settingsSchema.findById(id);
    const list = data?.autodl ?? [];
    urlCache.set(id, list);
    return list;
  }
}

module.exports = {
  getPrefix,
  setPrefix,
  addURL,
  removeURL,
  getURLs,
};
