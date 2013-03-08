// Config


// Try to load from secret config, otherwise use environment variables (heroku)
try {
  secret = require ('./secretConfig');
}
catch (e) {
  secret = {};
  secret.db = {};
  secret.twitter = {};
}

module.exports = {

  db: {
    URI: secret.db.URI || process.env.DB
  }

  twitter: {
    consumer_key: secret.twitter.consumer_key || process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: secret.twitter.consumer_secret  || process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: secret.twitter.access_token_key || process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: secret.twitter.access_token_secret || process.env.TWITTER_ACCESS_TOKEN_SECRET
  }
  
}
