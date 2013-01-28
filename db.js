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
    // Locations and counts should act as one object. They should
    // Be synced together perfectly.  E.g. locations[i] correlates to counts[i]
  locations: [{ type: Schema.Types.ObjectId, ref: 'location'}],
  counts: [Number]
});

// For interest schema, it would probably be better to have:
//  map_data: [{
//    location: {type: Schema.Types.ObjectId, ref: 'location'},
//    count: Number
//  }]
// But I haven't figured out how to use Mongoose to populate that field
// (if it is possible)

var locationSchema = new Schema({
  name: String
});



// Export models

module.exports = {
  interest: mongoose.model('interest', interestSchema),
  location: mongoose.model('location', locationSchema)
};



