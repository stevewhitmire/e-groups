var _ = require('lodash'),
  request = require('request'),
  xml2js = require('xml2js');

var defaultConfig = {};
try {
  defaultConfig = require('./config.json')
}
catch (e) {
  console.error('Failed to read server/config.json:');
  console.error(e);
}

var root = defaultConfig.ROOT_URL || process.env.ROOT_URL;

function hitAPI(opts, callback) {
  return request(_.defaults(opts, {
    method: 'GET',
    auth: {
      user: defaultConfig.AUTH_USERNAME || process.env.AUTH_USERNAME,
      pass: defaultConfig.AUTH_PASSWORD || process.env.AUTH_PASSWORD
    }
  }), callback);
}

exports.root = root;
exports.hitAPI = hitAPI;

exports.findGroupByID = function(groupID, callback) {
  var url = root + 'api.php?srv=group_profile_from_id&id=' + groupID;
  hitAPI({ url: url }, function(err, httpResponse, rawResponse) {
    if (err) {
      console.error('Find one failed:', err);
      return callback(err);
    }
    else {
      xml2js.parseString(rawResponse, function(err, parsed) {
        if (err) {
          console.error('Parse failed:', err);
          return callback(err);
        }
        else {
          var item = parsed
            && parsed.ccb_api
            && parsed.ccb_api.response
            && parsed.ccb_api.response[0]
            && parsed.ccb_api.response[0].groups
            && parsed.ccb_api.response[0].groups[0]
            && parsed.ccb_api.response[0].groups[0].group
            && parsed.ccb_api.response[0].groups[0].group[0]
            || {};
          simplifyXML(item);
          simplifyXML(item.main_leader);
          var udf = item.user_defined_fields.user_defined_field;
          if (udf) {
            item.groupType = udf[0].selection[0]._;
            item.people = udf[1].selection[0]._;
            item.ageGroup = udf[2] && udf[2].selection[0]._ || 'ANY';
          }
          item.address = item.addresses && item.addresses.address && item.addresses.address[0] || false;
          simplifyXML(item.address);
          item.childcareProvided = item.childcare_provided !== 'false';
          item.meetingTime = item.meeting_time._;
          item.meetingDay = item.meeting_day._;
          return callback(null, item);
        }
      });
    }
  });
};

function simplifyXML(item) {
  for (var key in item) {
    if (item.hasOwnProperty(key)) {
      item[key] = item[key][0];
    }
  }
}

exports.search = function(form, callback) {
  if (!callback) {
    callback = form;
    form = {};
  }

  var url = root + 'api.php?srv=group_search';
  for (var key in form) {
    if (form.hasOwnProperty(key)) {
      url += '&' + key + '=' + encodeURIComponent(form[key]);
    }
  }
  hitAPI({ url: url, method: 'POST' }, function(err, httpResponse, rawResponse) {
	  console.log(arguments);
    if (err) {
      console.error('Query failed:', err);
      return callback(err);
    }
    else {
      xml2js.parseString(rawResponse, function(err, parsed) {
        if (err) {
          console.error('Parse failed:', err);
          return callback(err);
        }
        else {
          var items = parsed
            && parsed.ccb_api
            && parsed.ccb_api.response
            && parsed.ccb_api.response[0]
            && parsed.ccb_api.response[0].items
            && parsed.ccb_api.response[0].items[0]
            && parsed.ccb_api.response[0].items[0].item
            && parsed.ccb_api.response[0].items[0].item.map
            && parsed.ccb_api.response[0].items[0].item.map(function(item) {
              simplifyXML(item);
              if (item.name && item.name.indexOf(' (') > 0) {
                var split = item.name.split(' (');
                item.name = split[0];
                item.groupType = split[1]
                  .slice(0, -1)
                  .toLowerCase();
                item.groupType = item.groupType[0].toUpperCase() + item.groupType.substr(1);
              }
              return item;
            })
            || [];
          return callback(null, items);
        }
      });

    }
  })
};
