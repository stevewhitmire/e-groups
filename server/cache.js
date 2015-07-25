var api = require('./api'),
  async = require('async'),
  _ = require('lodash');

var cached = {};

exports.start = function() {
  setInterval(refresh, 60 * 60 * 1000); // Every 60 minutes, refresh.
  refresh();
};

exports.fetch = function(id) {
  return cached[id];
};

function refresh() {
  console.log('Refreshing cache...');
  api.search(function(err, items) {
    if (err) {
      console.error('Failed to find groups');
      console.error(err);
      return; // Well, shoot... no point carrying on, now is there?
    }
    console.log('Found ' + items.length + ' groups to refresh.');

    async.parallel(items.map(function(item) {
      return function(callback) {
        api.findGroupByID(item.id, function(err, freshItem) {
          if (err) {
            console.error('Failed to refresh ' + item.id);
            console.error(err);
          }
          else if (freshItem) {
            console.log('Refreshed ' + item.id);
            cached[item.id] = _.pick(freshItem,
              'name',
              'description',
              'image',
              'groupType',
              'people',
              'ageGroup',
              'childcareProvided',
              'meetingTime',
              'meetingDay'
            );
            cached[item.id].address = _.pick(freshItem.address,
              'city',
              'state',
              'zip'
            );
          }
          callback();
        });
      };
    }), function() {
      console.log('Finished refreshing ' + items.length + ' groups.');
    });
  });
}