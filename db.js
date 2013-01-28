var config = require('./config/config'),
  Sequelize = require('sequelize');


var sequelize = new Sequelize(
  config.db.database,
  config.db.username,
  config.db.password, 
  {
    host: config.db.host,
    port: config.db.port
  }
);


var db = {};

// Set up models

db.interests = sequelize.define('interests', {
  name: Sequelize.STRING
}, {timestamps: false});

db.twitterinfo = sequelize.define('twitterinfo', {
  username: Sequelize.STRING
}, {timestamps: false});

db.locations = sequelize.define('locations', {
  name: Sequelize.STRING
}, {timestamps: false});

db.counts = sequelize.define('counts', {
  amount: Sequelize.INTEGER
}, {timestamps: false});


// Set up associations

db.interests.hasMany(db.twitterinfo);

db.interests.hasMany(db.counts);

db.locations.hasMany(db.counts);


// Sync

// Uncomment to force:
//sequelize.sync({force: true});

// Unforced:
sequelize.sync();


module.exports = db;

