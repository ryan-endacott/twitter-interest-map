
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
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
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});


var twitter = require('ntwitter');

var twit = new twitter({
  consumer_key: 'n5WyKBVmWudsps8X3GLlaw',
  consumer_secret: 'itjK8WdQkxRMjDB6SbjatovwrxgQhXXx2uLZvfz9Po',
  access_token_key: '1126351788-uZza6Zb6IKLQ3xcdXg8Moegr0OeA6FIljLZQB6U',
  access_token_secret: 'rrqAlFwbWa86KideKwOxlGjtPmPEuP7TR623ivOc'
});

twit.get('/followers/ids.json', {screen_name: 'nodejs'}, function(err, data) {
  console.log(data);
});