
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , twitter = require('ntwitter')
  , request = require('request')
  , db = require('./db')
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
var LIMIT_USER_SEARCH = 100;
var currentUsername = 0;

var numbers = /[0-9]/; //prevent numbers from being in one of the locations

function getFollowers(screen_name) {
  var followers = [];
  twit.get('/followers/ids.json', {screen_name: screen_name}, function(err, data) {
    if (err) console.log(err);
	if (!data) return;
    if (data.ids.length > LIMIT_USER_SEARCH) {
      data.ids.splice(0,data.ids.length - LIMIT_USER_SEARCH);
    }
    twit.get('/users/lookup.json', {user_id: data.ids.join()}, function(err, users) {
      if (err) console.log(err);
      if (!users) return;
	  users.forEach(function(user) {
        if (user && user.location && (blacklist.indexOf(user.location) == -1 ) && !numbers.test(user.location)) {
          followers.push({location: user.location, uid: user.id});
        }
	  });
      findUser(followers)
	});
  });
}

function findUser(followers) {
	followers.forEach(function(follower) {
		db.user.find({twitter_id:follower.id}, function (err, user) {
		  if (user) {
		  
		  } else {
			db.user.save({twitter_id:follower.id});
		  }
		});
	});
	console.log(followers);
   currentUsername++;
   if (currentUsername != twitterUsernames.length) {
	getFollowers(twitterUsernames[currentUsername]);
   } else {
	 console.log("Done");
   }
}

//uncomment the following line to query twitter for the folower uid's and locations
getFollowers(twitterUsernames[0]);

//we can use the google maps geolocation api to convert location strings to objects with city, state, and country strings
//this example functions takes an address and writes an object with the state and city to the console
function getLocation(address, callback) {
	request({url: 'http://maps.googleapis.com/maps/api/geocode/json', qs: {address:address, sensor: false}}, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
		var location = {};
		address_components = JSON.parse(body).results[0].address_components;
		for (var i=0;i<address_components.length;i++) {
			if (address_components[i].types.indexOf('locality') != -1) {
				location.city = address_components[i].long_name;
			} else if (address_components[i].types.indexOf('administrative_area_level_1') != -1) {
				location.state = address_components[i].long_name;
			} else if (address_components[i].types.indexOf('country') != -1) {
				location.country = address_components[i].long_name;
			}
		}
		callback(location);
	  }
	})
}
getLocation('baltimore', function(location) {
	console.log(location);
});