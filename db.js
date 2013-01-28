// Mongoose database models and schemas

var config = require('./config/config'),
  mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  connection = mongoose.connection;


mongoose.connect(config.db.URI);


// Set up schemas

var interestSchema = new Schema({
  name: String,
  twitter_names: [String],
  map_info: [{
    location_id: Schema.Types.ObjectId,
    count: Number
  }]
});

var locationSchema = new Schema({
  _id: Number,
  name: String
});



// Export models

module.exports = {
  interest: mongoose.model('interest', interestSchema),
  location: mongoose.model('location', locationSchema)
};



