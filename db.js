// Mongoose database models and schemas

var config = require('./config/config'),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  connection = mongoose.connection;


mongoose.connect(config.db.URI);


// Set up schemas

var interestSchema = new Schema({
  name: String,

    // Twitter handles associated with a given interest
  twitter_names: [String],

    // Get the locations by calling:
    // db.interest.findOne().populate('map_data.location').exec(
    // function(err, result) {});  
  updated: {type: Date, default: Date.now}
});


var locationSchema = new Schema({
  raw: String,
  city: String,
  state: String,
  country: String,
  state_short: String,
  country_short: String,
});


var userSchema = new Schema({
  twitter_id: Number,
  location: {type: Schema.Types.ObjectId, ref: 'location'},
  interests: [{type: Schema.Types.ObjectId, ref: 'interest'}]
});

var interestLocationsSchema = new Schema({
  interest: {type: Schema.Types.ObjectId, ref: 'interest'},
  type: String,
  location: String,
  location_short: String,
  location_parent: String,
  count: {type: Number, default: 1 }
});

// Export models

module.exports = {
  interest: mongoose.model('interest', interestSchema),
  location: mongoose.model('location', locationSchema),
  interest_locations: mongoose.model('interest_locations', interestLocationsSchema),
  user: mongoose.model('user', userSchema)
};



