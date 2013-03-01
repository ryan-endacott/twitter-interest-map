var async = require('async'),
    db = require('./db')
    
module.exports.run = function(callback) {
async.waterfall([
  function (callback) {
    db.relativePopulation.where('type').equals('state').remove(function(err) {
      callback(err)
    })
}, function(callback) {
    db.interest_locations.find({type: 'state', location_parent: 'US'},function(err, interest_locations) {
      callback(err, interest_locations)
    })
}, function (interest_locations, callback) {
    var total=0, states = []
    async.forEachSeries(interest_locations, function(document, callback) {
      added = 0;
      if (document) {
        total+=document.count
        for (var i=0;i<states.length;i++) {
          if (states[i].name == document.location) {
            added = 1;
            states[i].count+=document.count
            callback()
            break;
          }
        }
        if (added == 0) states.push({count: document.count, name: document.location})
      }
      if (added == 0) callback()
    }, function(err) {
      callback(err, states,total)
    })
}, function (states, total, callback) {
    async.forEachSeries(states, function(state, callback) {
      var x = new db.relativePopulation({type: 'state', location: state.name, percentage: ((state.count)/total).toFixed(3)})
      x.save(function(err) {
        callback(err)
      })
    }, function(err) {
      console.log(states.length + " state percentages have been added to the database")
      callback(err)
    })
  }
], function(err) {
  if (err) console.log(err)
  callback()
})
}