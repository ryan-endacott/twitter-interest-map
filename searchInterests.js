var async = require('async'),
      db = require('./db'),
      twitter = require('ntwitter')
var twit = new twitter({
  consumer_key: 'n5WyKBVmWudsps8X3GLlaw',
  consumer_secret: 'itjK8WdQkxRMjDB6SbjatovwrxgQhXXx2uLZvfz9Po',
  access_token_key: '1126351788-uZza6Zb6IKLQ3xcdXg8Moegr0OeA6FIljLZQB6U',
  access_token_secret: 'rrqAlFwbWa86KideKwOxlGjtPmPEuP7TR623ivOc'
})
var completed_interests = [] //array of screen_name arrays
var interests = ['comedy', 'CNN']
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