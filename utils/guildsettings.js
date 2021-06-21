const settingsSchema = require("../schemas/guildsettings-schema");
const prefixCache = new Map();

async function getPrefix(id) {
  if (prefixCache.has(id)) return prefixCache.get(id);

  const result = await settingsSchema.findById(id);
  if (!result.prefix) {
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

  if (prefix === null) {
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

module.exports = {
  getPrefix,
  setPrefix,
};
