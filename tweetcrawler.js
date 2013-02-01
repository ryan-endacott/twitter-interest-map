// This is the file that will hopefully do all of the twitter database work
// Hopefully a successful refactoring of app.js

var async = require('async'),
  db = require('./db'),
  twitter = require('ntwitter');



var tweetCrawler = {};


var twit = new twitter({
  consumer_key: 'n5WyKBVmWudsps8X3GLlaw',
  consumer_secret: 'itjK8WdQkxRMjDB6SbjatovwrxgQhXXx2uLZvfz9Po',
  access_token_key: '1126351788-uZza6Zb6IKLQ3xcdXg8Moegr0OeA6FIljLZQB6U',
  access_token_secret: 'rrqAlFwbWa86KideKwOxlGjtPmPEuP7TR623ivOc'
});

var LIMIT_USER_SEARCH = 100;

// Global variables to hold stuff to keep from
// checking database if we already have
var cachedInterests;

tweetCrawler.run = function() {

  console.log('Starting another tweetCrawler.run()');

  async.waterfall([

    function getInterestsToCrawl(callback) {
      if (cachedInterests) 
        callback(null, cachedInterests);
      else  
        db.interest.find(callback);
    },
    function cacheInterests(interests, callback) {

      cachedInterests = interests;

      callback(null, interests);
    },
    function getNextInterestToDo(interests, callback) {

      // Get first interest, can later be done by priority (e.g. date last updated)
      var curInterest = interests.splice(0,1);

      if (curInterest.length)
        callback(null, curInterest[0])
      // Start over if there are no more interests
      else
        callback("Couldn't find another interest to run.");
    },
    function getFollowerIDs(interest, callback) {

      async.map(interest.twitter_names, function(twitter_name, callback) {
        twit.get('/followers/ids.json', {screen_name: twitter_name}, callback);
      }, callback);

    },
    function getCachedFollowersFromDB(followers, callback) {
      if (!followers.length) callback("Didn't get any followers from twitter.");


      var ids = followers[0].ids.splice(0, LIMIT_USER_SEARCH);


      // Find all users that we already have stored
      db.user.find().where('twitter_id').in(ids).populate('location').exec(function(err, users) {

        callback(err, ids, users)

      });

    },
    function getListOfCachedIds(ids, cachedUsers, callback) {

      async.map(cachedUsers, function(user, callback) {
        callback(null, user.twitter_id);
      }, function(err, cachedIds){
        callback(err, ids, cachedUsers, cachedIds);
      })

    },
    function getUncachedIds(ids, cachedUsers, cachedIds, callback) {

      // Loop through all ids, if they aren't in cached, add to uncached list
      async.reject(ids, function(id, callback) {

        callback(id in cachedIds)

      }, function(uncachedIds) {

        callback(null, uncachedIds, cachedUsers);

      });

    },
    function getRawUncachedUsers(uncachedIds, cachedUsers) {

      console.log(uncachedIds);

//      twit.get('/users/lookup.json', {user_id: followers.ids.join()}, function(err, u));
    }


  ],

  // Last error handling function
  // Log error then restart
  function(err, result) {
    if (err) console.log(err);

    tweetCrawler.run();
  });

};


// HELPER FUNCTIONS:

//we can use the google maps geolocation api to convert location strings to objects with city, state, and country strings
//this example functions takes an address and writes an object with the state and city to the console
function getLocationFromRaw(address, callback) {
  request({url: 'http://maps.googleapis.com/maps/api/geocode/json', qs: {address:address, sensor: false}}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
    var location = {raw: address};
    if (JSON.parse(body).results.length) {
    address_components = JSON.parse(body).results[0].address_components;
    if (address_components){
      for (var i=0;i<address_components.length;i++) {
      if (address_components[i].types.indexOf('locality') != -1) {
        location.city = address_components[i].long_name;
      } else if (address_components[i].types.indexOf('administrative_area_level_1') != -1) {
        location.state = address_components[i].long_name;
      } else if (address_components[i].types.indexOf('country') != -1) {
        location.country = address_components[i].long_name;
      }
      }
    }
    }

    callback(location);
    }
  })
}


// Export!
module.exports = tweetCrawler;
