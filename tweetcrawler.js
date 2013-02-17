// This is the file that will hopefully do all of the twitter database work
// Hopefully a successful refactoring of app.js

var async = require('async'),
  db = require('./db'),
  twitter = require('ntwitter'),
  request = require('request');



var tweetCrawler = {};


var twit = new twitter({
  consumer_key: 'n5WyKBVmWudsps8X3GLlaw',
  consumer_secret: 'itjK8WdQkxRMjDB6SbjatovwrxgQhXXx2uLZvfz9Po',
  access_token_key: '1126351788-uZza6Zb6IKLQ3xcdXg8Moegr0OeA6FIljLZQB6U',
  access_token_secret: 'rrqAlFwbWa86KideKwOxlGjtPmPEuP7TR623ivOc'
});


var stats = new db.stat();
var LIMIT_USER_SEARCH = 100;
var times_run = 0;
var MAX_TIMES_RUN = 5;

// Global variables to hold stuff to keep from
// checking database if we already have
var cachedInterests;
var curInterest;

tweetCrawler.run = function() {


  console.log('\n\nStarting another tweetCrawler.run()');
  times_run++;

  async.waterfall([

    function getInterestsToCrawl(callback) {

      // Reset stats to new
      stats = new db.stat();
      stats.start_time = new Date().getTime();

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
      curInterest = interests.splice(0,1);

      if (curInterest.length)
        callback(null, curInterest[0])
      // Start over if there are no more interests
      else
        callback("Couldn't find another interest to run.");
    },
    function getFollowerIDs(interest, callback) {
      stats.interest = interest._id;
      async.map(interest.twitter_names, function(twitter_name, callback) {
        twit.get('/followers/ids.json', {screen_name: twitter_name}, callback);
      }, callback);

    },
    function combineFollowerIds(followers, callback) {
      if (!followers.length) callback("Didn't get any followers from twitter.");

      async.concat(followers, function(follower, callback) {
        callback(null, follower.ids);
      }, callback);
    },
    function getCachedFollowersFromDB(ids, callback) {

      stats.retrieved_followers = ids.length;

      // Find all users that we already have stored
      db.user.find().where('twitter_id').in(ids).populate('location').exec(function(err, users) {

        callback(err, ids, users)

      });

    },
    function getListOfCachedIds(ids, cachedUsers, callback) {
      stats.cached_users = cachedUsers.length;
      async.map(cachedUsers, function(user, callback) {
        callback(null, user.twitter_id);
      }, function(err, cachedIds){
        callback(err, ids, cachedUsers, cachedIds);
      })

    },
    function getUncachedIds(ids, cachedUsers, cachedIds, callback) {

      // Loop through all ids, if they aren't in cached, add to uncached list
      async.filter(ids, function(id, callback) {

        var index = cachedIds.indexOf(id)
        callback(index == -1)

      }, function(uncachedIds) {

        callback(null, uncachedIds, cachedUsers);

      });

    },
    function determineRawUncachedUsers(uncachedIds, cachedUsers, callback) {

      // Chunk the ids into groups of 100 for twitter api limit
      var i, j, chunk = LIMIT_USER_SEARCH;
      var chunkedIds = [];
      for (i=0,j=uncachedIds.length; i<j; i+=chunk) {
          chunkedIds.push(uncachedIds.slice(i,i+chunk));
      }

      // Call the twitter api in chunks of 100 then combine results to be handled
      async.concat(chunkedIds, function(ids, callback) {

        twit.get('/users/lookup.json', {user_id: ids.join()}, callback);

      }, function(err, rawUsers) {
        if (err)
          console.log('Error from twitter API /users/lookup');

        // Remove users without a location given
        async.filter(rawUsers, function(rawUser, callback) {
          callback(rawUser.location);
        }, function(rawUsers) {
          callback(err, rawUsers, cachedUsers);
        });

      });

    },
    function getRawUncachedUsers(rawUsers, cachedUsers, callback) {
      stats.new_uncached_users = rawUsers.length;
      async.map(rawUsers, function(rawUser, callback) {
        saveRawUser(rawUser, callback);
      }, function(err, newUsers) {
        // Combine all users
        var users = newUsers.concat(cachedUsers);
        
        callback(err, users);
      });
    },
    function remove_previously_counted_users(users, callback) {
      stats.before_remove_prev_counted = users.length;
      async.reject(users,function(user, callback) {
        callback(user.interests.indexOf(curInterest[0]._id)!=-1);
      }, function(users) {  
        callback(null, users);
      });
    },
    function update_location_country_counts(users, callback) {
      stats.after_remove_prev_counted = users.length;
      async.forEachSeries(users, function(user, callback) {
        if (user.location.country) {  //wait, how did we get this far if the user doesn't have a country? #bug
          db.interest_locations.findOne({ type: 'country', location: user.location.country, interest: curInterest[0]._id}, function (err, row) {
              if (row) {
                 row.count++;
                 row.save(function(err) {
                   callback(err);
                 });
              } else {
                var new_interest_location_row = new db.interest_locations({type: 'country', location_short: user.location.country_short, location: user.location.country, interest: curInterest[0]._id});
                new_interest_location_row.save(function(err) {
                   callback(err);
                 });
              }
          });
        } else {
          callback(null);
        }
      }, function(err){
        callback(err, users);
      });
    },
    function update_location_state_counts(users, callback) {
      async.forEachSeries(users, function(user, callback) {
        if (user.location.state) {
          db.interest_locations.findOne({ type: 'state', location_parent: user.location.country_short, location: user.location.state, interest: curInterest[0]._id}, function (err, row) {
              if (row) {
                 row.count++;
                 row.save(function(err) {
                   callback(err);
                 });
              } else {
                var new_interest_location_row = new db.interest_locations({type: 'state', location_parent: user.location.country_short, location: user.location.state, interest: curInterest[0]._id});
                new_interest_location_row.save(function(err) {
                   callback(err);
                 });
              }
          });
        } else {
          callback(null);
        }
      }, function(err){
        callback(err, users);
      });
    },
    function update_location_city_counts(users, callback) {
      async.forEachSeries(users, function(user, callback) {
        if (user.location.city) {
          if (user.location.country_short == 'US') {
            var location_parent = user.location.country_short + '-' + user.location.state_short
          } else {
            var location_parent = user.location.country_short
          }
          db.interest_locations.findOne({ type: 'city', location: user.location.city, location_parent: location_parent, interest: curInterest[0]._id}, function (err, row) {
              if (row) {
                 row.count++;
                 row.save(function(err) {
                   callback(err);
                 });
              } else {
                var new_interest_location_row = new db.interest_locations({type: 'city', location_parent: location_parent, location: user.location.city, interest: curInterest[0]._id});
                new_interest_location_row.save(function(err) {
                   callback(err);
                 });
              }
          });
        } else {
          callback(null);
        }
      }, function(err){
        callback(err, users);
      });
    },
    function convert_users_to_uids(users, callback) {//There should be a better way to do this, such as just pass in the array of users to the db call, but I can't find out how to do this.
      //console.log('LOGGING ALL USERS:');
      //console.log(users);
      async.map(users, function(user, callback) {
        callback(null, user._id);
      }, function(err, uids){
        callback(err, uids);
      });  
    }, function update_users_with_interest(uids, callback) {
      db.user.update({ _id: { $in: uids }}, { $addToSet: { interests: curInterest[0]._id }}, {multi: true}, function(err){ //$addToSet will only add the interest id if it is not already in the array
        callback(err);
      });
    }, function(callback) {
       stats.endTime = new Date();
       console.log(stats);
      //send stat object to separate app
      console.log('Done with an interest!');
      callback(null);
    }


  ],

  // Last error handling function
  // Log error then restart
  function(err, result) {


    // save stats
    stats.end_time = new Date().getTime();
    stats.time_to_run = (stats.end_time - stats.start_time) / 1000;


    if (err){

      var errIsString = (typeof(err) === 'string')

      stats.error_message = errIsString? err : (err.name + ': ' + err.message);
      console.log(err);

      // print stack trace if it's not a string, thus a real error
      if (!errIsString) {
        console.log(err.stack);
        console.trace();
      }
    }


    stats.save();


    if (times_run < MAX_TIMES_RUN)
      tweetCrawler.run();
  });

};


// HELPER FUNCTIONS:

// Completely handles a raw user from twitter:
// 1. Saves its formatted location to db (checking if cached first)
// 2. Saves user to database, then calls callback with (err, newUser)
function saveRawUser(rawUser, callback) {

  async.waterfall([

    // Check database for location
    function checkDBForLoc(callback) {
      db.location.findOne({raw: rawUser.location}, function(err, loc) {
        callback(err, loc, rawUser);
      });
    },
    function getValidLoc(loc, rawUser, callback) {

      // Found so continue
      if (loc) callback(null, loc, rawUser);
      // Didn't find, so create from raw and store in db
      else {
        getLocationFromRaw(rawUser.location, function(err, loc) {
          db.location.create(loc, function(err, loc) {
            callback(err, loc, rawUser);
          });
        });
      }

    },
    function createNewUser(loc, rawUser, callback) {

      db.user.create({twitter_id: rawUser.id, location: loc}, function(err, newUser) {

        // newUser has lost his location ref here, so re add it
        // This is a hacky solution that adds it by populating from database
        // We shouldn't need to go back to database, because location is just loc from above
        // However, if you do `newUser.location = loc` it only assigns the objectId.  
        // So this is a temporary workaround
        db.user.findOne(newUser).populate('location').exec(callback);

      });
    }
    ],
    function doCallback(err, user) {
      // Do the main callback with result as the user
      callback(err, user);
    })
  

};



//we can use the google maps geolocation api to convert location strings to objects with city, state, and country strings
//this example functions takes an address and writes an object with the state and city to the console
function getLocationFromRaw(address, callback) {

  request({url: 'http://maps.googleapis.com/maps/api/geocode/json', qs: {address:address, sensor: false}}, function (error, response, body) {
    body = JSON.parse(body);
    
    // If google has throttled us, try again in two seconds
    if (body.status == 'OVER_QUERY_LIMIT') {
      setTimeout(function() {
        getLocationFromRaw(address, callback)
      }, 2000);
    }
     
    else {

      var location = {raw: address};
      if (!error && response.statusCode == 200) {
        if (body.results.length) {
          var address_components = body.results[0].address_components
          if (address_components){
            for (var i=0;i<address_components.length;i++) {
              if (address_components[i].types.indexOf('locality') != -1) {
                location.city = address_components[i].long_name;
              } else if (address_components[i].types.indexOf('administrative_area_level_1') != -1) {
                location.state = address_components[i].long_name;
                location.state_short = address_components[i].short_name
              } else if (address_components[i].types.indexOf('country') != -1) {
                location.country = address_components[i].long_name;
                location.country_short = address_components[i].short_name
              }
            }
          }
        }

      }


      callback(null, location);



    }




  })
}

// Export!
module.exports = tweetCrawler;