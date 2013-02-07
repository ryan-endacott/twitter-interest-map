var express = require('express')
     , routes = require('./routes')
     , http = require('http')
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
  app.use(express.static(__dirname, 'public'));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

//an easy way to add interests while we are developing the app
//ex: http://localhost:3000/interest/add/news?twitter_names=cnn,msnbc,FoxNews
app.get('/interest/add/:name', function(req, res) {
	db.interest.create({name: req.params.name, twitter_names: req.query.twitter_names.split(',')}, function(err, interest) {
		res.send(interest);
	});
});
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

require('./tweetcrawler').run();