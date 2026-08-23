const serverHandler = require('../server.js');
module.exports = async (req, res) => {
  return serverHandler(req, res);
};
