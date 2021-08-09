const { awardActivityMoney } = require("@utils/economy");

module.exports = function (message) {
  awardActivityMoney(message);
};
