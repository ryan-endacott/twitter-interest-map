var async = require('async'),
    db = require('./db')
    
async.waterfall([
  function (callback) {
    db.relativePopulation.where('type').equals('country').remove(function(err) {
      callback(err)
    })
}, function(callback) {
    db.interest_locations.find({type: 'country'},function(err, interest_locations) {
      callback(err, interest_locations)
    })
}, function (interest_locations, callback) {
    var total=0, countries = []
    async.forEachSeries(interest_locations, function(document, callback) {
      added = 0;
      if (document) {
        total+=document.count
        for (var i=0;i<countries.length;i++) {
          if (countries[i].name == document.location_short) {
            added = 1;
            countries[i].count+=document.count
            callback()
            break;
          }
        }
        if (added == 0) countries.push({count: document.count, name: document.location_short})
      }
      if (added == 0) callback()
    }, function(err) {
      callback(err, countries,total)
    })
}, function (countries, total, callback) {
    async.forEachSeries(countries, function(country, callback) {
      var x = new db.relativePopulation({type: 'country', location: country.name, percentage: ((country.count)/total).toFixed(3)})
      x.save(function(err) {
        callback(err)
      })
    }, function(err) {
      console.log(countries.length + " country percentages have been added to the database")
      callback(err)
    })
  }
], function(err) {
  if (err) console.log(err)
  process.exit()
})