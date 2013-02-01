// This is the file that will hopefully do all of the twitter database work
// Hopefully a successful refactoring of app.js

var Step = require('step'),
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

  Step(

    function getInterestsToCrawl() {
      if (cachedInterests) 
        this(null, cachedInterests);
      else  
        db.interest.find(this);
    },
    function cacheInterests(err, interests) {
      if (err) throw err;

      cachedInterests = interests;

      this(null, interests);
    },
    function getNextInterestToDo(err, interests) {
      if (err) throw err;

      // Get first interest, can later be done by priority (e.g. date last updated)
      var curInterest = interests.splice(0,1);

      if (curInterest.length)
        this(null, curInterest[0])
      // Start over if there are no more interests
      else
        tweetCrawler.run();
    },
    function getFollowerIDs(err, interest) {
      if(err) throw err;

      // Build up a group so we get ids of all followers of each topic
      var group = this.group();

      interest.twitter_names.forEach(function (twitter_name) {
        twit.get('/followers/ids.json', {screen_name: twitter_name}, group());
      })
    }


  )
}


module.exports = tweetCrawler;
