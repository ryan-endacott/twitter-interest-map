var express = require('express')
     , http = require('http')
	 , db = require('./db');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.logger('dev'));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

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