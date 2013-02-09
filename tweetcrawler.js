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
    function determineRawUncachedUsers(uncachedIds, cachedUsers, callback) {

      twit.get('/users/lookup.json', {user_id: uncachedIds.join()}, function(err, rawUsers) {

        // Remove users without a location given
        async.filter(rawUsers, function(rawUser, callback) {
          callback(rawUser.location);
        }, function(rawUsers) {
          callback(err, rawUsers, cachedUsers);
        });
      });
    },
    function getRawUncachedUsers(rawUsers, cachedUsers, callback) {

      async.map(rawUsers, function(rawUser, callback) {
        saveRawUser(rawUser, callback);
      }, function(err, newUsers) {
        // Combine all users
        var users = newUsers.concat(cachedUsers);
        callback(err, users);
      });
    },
    function remove_previously_counted_users(users, callback) {
      console.log("Before remove_previously_counted_users() user count = %d", users.length);
      async.rejectSeries(users,function(user, callback) {
        callback(user.interests.indexOf(curInterest[0]._id)!=-1);
      }, function(users) {  
        callback(null, users);
      });
    },
    function update_location_counts(users, callback) {
      console.log("After remove_previously_counted_users() user count = %d", users.length);
      async.forEach(users, function(user, callback) {
        db.interest_locations.findOne({ location: user.location._id, interest: curInterest[0]._id}, function (err, row) {
            if (row) {
               row.count++;
               row.save(function(err) {
                 callback(err);
               });
            } else {
              var new_interest_location_row = new db.interest_locations({location: user.location._id, interest: curInterest[0]._id});
              new_interest_location_row.save(function(err) {
                 callback(err);
               });
            }
            //console.log(row);
            callback(err, users);
        });
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
      console.log('Done with an interest!');
      callback(null);
    }


  ],

  // Last error handling function
  // Log error then restart
  function(err, result) {
    if (err){
      console.log(err);

      // print stack trace if it's not a string, thus a real error
      if (typeof(err) !== 'string') {
        console.log(err.stack);
        console.trace();
      }
   }

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

    var body = JSON.parse(body);
    
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
          address_components = body.results[0].address_components;
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

      }


      callback(null, location);



    }




  })
}

// Export!
module.exports = tweetCrawler;