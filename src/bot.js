let recastai = require('recastai');

let client = new recastai.Client(process.env.RECAST_TOKEN);

module.exports = phoneNumber => input => client.textConverse(input, { 
  conversationToken: phoneNumber 
})
  .then(res => {
    return res.replies[0];
  });