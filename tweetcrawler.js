// This is the file that will hopefully do all of the twitter database work
// Hopefully a successful refactoring of app.js

var Step = require('step'),
  db = require('./db');



var tweetCrawler = {};

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
      this(null, interests.splice(0,1))
    }


  )
}


module.exports = tweetCrawler;
