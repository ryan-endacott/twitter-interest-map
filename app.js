
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , twitter = require('ntwitter')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var twit = new twitter({
  consumer_key: 'n5WyKBVmWudsps8X3GLlaw',
  consumer_secret: 'itjK8WdQkxRMjDB6SbjatovwrxgQhXXx2uLZvfz9Po',
  access_token_key: '1126351788-uZza6Zb6IKLQ3xcdXg8Moegr0OeA6FIljLZQB6U',
  access_token_secret: 'rrqAlFwbWa86KideKwOxlGjtPmPEuP7TR623ivOc'
});
var blacklist = ['world', 'theworld'];

var twitterUsernames = ['nodejs', 'google'];
var LIMIT_USER_SEARCH = 30;
var currentUsername = 0;

function getFollowerLocations(screen_name) {
  var follower_locations = [];
  twit.get('/followers/ids.json', {screen_name: screen_name}, function(err, data) {
    if (err) console.log(err);
	if (!data) return;
    if (data.ids.length > LIMIT_USER_SEARCH) {
      data.ids.splice(0,data.ids.length - LIMIT_USER_SEARCH);
    }
    twit.get('/users/lookup.json', {user_id: data.ids.join()}, function(err, users) {
	  //console.log(users);
	  users.forEach(function(user) {
	    if (err) console.log(err);
        if (user && user.location && (blacklist.indexOf(user.location) == -1 )) {
          follower_locations.push(user.location);
        }
	  });
      console.log('\n"'+ screen_name + '" follower locations:');
      console.log(follower_locations);
       // update DB here with the follower locations
       currentUsername++;
	   if (currentUsername != twitterUsernames.length) {
		getFollowerLocations(twitterUsernames[currentUsername]);
	   } else {
	     console.log("Done");
	   }
	});
  });
}
getFollowerLocations(twitterUsernames[0]);