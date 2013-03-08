var async = require('async'),
      db = require('./db'),
      twitter = require('ntwitter'),
      program = require('commander'),
      config = require('./config/config');
      
var twit = new twitter({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token_key: config.twitter.access_token_key,
  access_token_secret: config.twitter.access_token_secret
});

function list(val) {
  return val.split(',')
}
program
  .option('-i, --interests <items>', 'Comma separated list of interests', list)
  .parse(process.argv)
if (!program.interests) {
  console.log('You must enter interests to search for by using command line arguments (-i or --interests then a comma separated list of interests)')
  process.exit();
}
var interests = program.interests
var currentInterest = 0
var findTwitterUsers = function() {
async.waterfall([
  function(callback){
    callback(null, interests[currentInterest]);
  },
  function(interest, callback) {
    twit.get('/users/search.json', {q: interest}, function(err, data) {
      callback(err, data)
    });
  }, function(users, callback) {
      async.map(users.splice(0,20), function(user, callback) {
        callback(null, user.screen_name);
      }, function(err, screen_names){
        callback(null, screen_names)
    })
  }, function(screen_names, callback) {
    console.log("Top twitter users for the interest '" + interests[currentInterest]+"'");
    console.log(screen_names);
    callback(null, screen_names)
  }, function (screen_names, callback) {
     db.interest.findOne({ name: interests[currentInterest]}, function (err, interest) {
      if (!interest) {
        var new_interest = new db.interest({name: interests[currentInterest], twitter_names: screen_names, needToRun:true});
        new_interest.save(callback);
      } else {
       callback(err);
      }
  });
  }
], function(err) {
  if (err) console.log(err)
  currentInterest++;
  if (currentInterest < interests.length) {
    findTwitterUsers()
  } else
    process.exit();
 });
}
findTwitterUsers();