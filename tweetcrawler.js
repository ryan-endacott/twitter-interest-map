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
    function getInterestsToCrawl(err, interests) {
      if (err) throw err;

      cachedInterests = interests;

    }

  )
}


module.exports = tweetCrawler;
