// TODO: Import.js hasn't been ported for e/groups; it's far better to use the /#/start-a-group page instead of importing from elsewhere!
var request = require('request'),
  async = require('async'),
  fs = require('fs'),
  api = require('./server/api');

if (!fs.existsSync('./groups.tsv')) {
  console.error('Please export the groups spreadsheet as "groups.tsv" and place it in the same directory as this file.');
  process.exit(1);
}

var groups = fs
  // Read in the file
  .readFileSync('./groups.tsv', 'utf8')
  // Split it by line
  .split('\n')
  // Split each line by the tab character
  .map(function(item) {
    return item.split('\t')
  })
  // Remove any blank lines
  .filter(function(item) {
    return item.length > 1;
  });

var headers = groups.shift();

groups = groups.map(function(item) {
  var dict = {};
  for (var i = 0; i < headers.length; i++) {
    dict[headers[i]] = item[i] || '';
  }
  return dict;
});

createOne(groups.shift());

function createOne(group) {
  var data = {};

  function append(key, val) {
    if (typeof val === 'string') {
      val = val.replace(/[^a-z0-9! /?,:;-]/ig, '');
    }
    data[key] = val;
  }

  append('name', group['e/group Name']);
  append('description', group['Group Description']);
  append('meeting_location_street_address', group['Meeting Place']);
  append('public_search_listed', true);
  append('listed', true);
  //append('interaction_type', 'Members Interact');
  //append('membership_type', 'Open to All');
  //append('notification', '1');


  var locMap = [ 'Newark', 'Bear', 'Elkton', 'Wilmington', 'Middletown' ];
  for (var i = 0; i < locMap.length; i++) {
    var city = locMap[i];
    if (group['Meeting Place'].indexOf(city) >= 0) {
      append('meeting_location_city', city);
      break;
    }
  }

  var stateMap = [ 'MD', 'DE' ];
  for (var j = 0; j < stateMap.length; j++) {
    var state = stateMap[j];
    if (group['Meeting Place'].indexOf(state) >= 0) {
      append('meeting_location_state', state);
      break;
    }
  }

  var zip = group['Meeting Place'].match(/ (\d{5})/);
  if (zip && zip[1]) {
    append('meeting_location_zip', zip[1]);
  }

  /*<select name="type_id">
   <option value="1">e/groups</option>
   <option value="2">Interest</option>
   <option value="3">Seminar</option>
   <option value="4">Task / Action</option>
   <option value="5">Church</option>
   <option value="6">Campus</option>
   </select>*/
  append('group_type_id', '1');

  if (group['Is this group child-friendly?'] === 'Yes') {
    append('childcare_provided', true);
  }

  /* Type of e/group:
   <select name="udf_pulldown_1_id">
   <option value="NONE">Choose...</option>
   <option value="1">Activity</option>
   <option value="2">Discussion</option>
   <option value="3">Care</option>
   <option value="4">Code Red</option>
   <option value="5">NextGen</option>
   </select>
   */
  append('udf_group_pulldown_1_id', categoryToID(group['e/group Category']));

  /* People:
   <select name="udf_pulldown_2_id">
   <option value="NONE">Choose...</option>
   <option value="1">Men</option>
   <option value="2">Women</option>
   <option value="3">Co-ed</option>
   <option value="4">Students</option>
   </select>
   */
  append('udf_group_pulldown_2_id', forToID(group['Who is your e/group for?']));

  /* Age Group:
   <select name="udf_pulldown_3_id">
   <option value="NONE">Choose...</option>
   <option value="4">Any</option>
   <option value="9">Middle School</option>
   <option value="10">High School</option>
   <option value="8">18-24</option>
   <option value="6">18+</option>
   <option value="7">Young Adults</option>
   <option value="5">40+</option>
   </select>
   */
  append('udf_group_pulldown_3_id', ageToID(group['Age Range']));
  function ageToID(age) {
    switch (age) {
      case 'N/A':
      case 'n/a':
      case '11-99':
      case '0-100':
      case '8-80':
      case 'All':
        return '4';
      case '40 up':
        return '5';
      case '18 +':
      case 'Adults':
      case '18 + ':
      case '18-up':
      case '18  and up':
      case '18 and up':
      case '16+':
      case 'Co-ed, Men, Women, married and single. 20++':
        return '6';
      case '18-24':
      case '18 to 24':
        return '8';
      case '21-35':
      case '20s and 30s':
        return '7';
      case '6th-8th grade students':
        return '9';
      default:
        return '4';
    }
  }

  /* Meeting Day
   <select name="meet_day_id">
   <option value="">Choose...</option>
   <option value="1">Varies</option>
   <option value="2">Weekdays</option>
   <option value="3">Weekends</option>
   <option value="4">Sunday</option>
   <option value="5">Monday</option>
   <option value="6">Tuesday</option>
   <option value="7">Wednesday</option>
   <option value="8">Thursday</option>
   <option value="9">Friday</option>
   <option value="10">Saturday</option>
   <option value="11">Every Other Sunday</option>
   <option value="12">Every Other Monday</option>
   <option value="13">Every Other Tuesday</option>
   <option value="14">Every Other Wednesday</option>
   <option value="15">Every Other Thursday</option>
   <option value="16">Every Other Friday</option>
   <option value="17">Every Other Saturday</option>
   <option value="18">First Sunday of Every Month</option>
   <option value="19">First Monday of Every Month</option>
   <option value="20">First Tuesday of Every Month</option>
   <option value="21">First Wednesday of Every Month</option>
   <option value="22">First Thursday of Every Month</option>
   <option value="23">First Friday of Every Month</option>
   <option value="24">First Saturday of Every Month</option>
   </select>
   */
  append('meeting_day_id', dateToID(group['Meeting Dates']));
  function dateToID(date) {
    switch (date) {
      case 'Weekly on Mondays':
      case 'Mondays at 7pm with varying volunteer dates':
        return '5';
      case 'Various event on different days at different times!':
        return '1';
      case 'Once a month, every 2nd Tuesday of the semester':
        return '20';
      case 'Every Wednesday of the semester EXCEPT 2nd Wednesdays (meets 1st, 3rd, 4th, and 5th Wednesdays)':
      case 'Wednesdays':
      case 'Wednesday':
      case 'Weekly Wednesday':
      case 'I would like to meet on every Wednesday.':
      case 'Weekly Wednesday evenings':
      case '7/9, 7/16, 7/23, 7/30, 8/6':
        return '7';
      case 'Regular discussion e/group meetings will be held each Sunday from 4:00pm - 6:30pm, with optional activity groups for viewing/discussing of current summer movies & blockbusters at local movie theaters every Friday night.':
      case 'Sundays 6/29 7/6 7/13 7/20 7/27 8/3 8/10':
      case 'Sunday June 29th Friday July 11th Friday July 18th Thursday July 24th Friday August 1st Friday August 8th Friday August 15th':
      case 'Sundays 7/13 and 7/20 (weather permitting) , finishing with a cook out at the Robertson\'s house on Sunday, 8/10.':
      case 'Sundays':
        return '4';
      case 'Every Saturday morning starting June 28th.':
      case 'Saturdays 9am':
      case 'Saturday':
      case 'Saturday mornings':
        return '10';
      case 'Either Friday or Saturday evenings depending where the cruise\'s are held':
      case 'Fridays  (This e/group will also have an optional activity component for members wanting additional fellowship beyond the weekly discussion meetings. Members will have the opportunity to view movies at Sunday matinees every week, and then discuss them afterwards, as well as participate in Under The Stars, Rooftop Movie Series every Monday night, on top of Shop-Rite in Wilmington, DE.)':
      case 'Fridays July 11,18, 25 Aug 1, 8 ':
        return '9';
      case 'Thursdays beginning July 3rd':
      case 'Every Thursday from the beginning of the semester until the end.':
      case 'Weekly on Thursdays':
      case 'Thursdays':
      case 'Thursdays, 7/10, 7/17, 7/24, 7/31, 8/7, 8/14, 8/21':
        return '8';
      case 'Tuesdays':
      case 'Tuesday evenings':
      case 'Tuesdays 7/1 day activity 7/8 night activity 7/15 day activity 7/22 night activity 7/28 day activity  How long does this go?? :-)':
      case 'Weekly on Tuesday evening. ':
      case 'Tuesdays 7/1 thru 8/26':
      case 'Tuesday Nights (Tues 7/1 - Tues 8/12)':
      case 'We will meet every Tuesday night at a local park.  We will learn what Elevate Life Church has to offer, and what we can offer ':
      case 'Tuesdays: 7/1, 7/8, 7/15, 7/22, 7/29, 8/5, 8/12':
        return '6';
      case 'Meetings will be every other Monday starting on 6/30, 7/14, 7/28 and last meeting 8/11.':
        return '12';
      default:
        return '';
    }
  }

  /* Meeting Time
   <select name="meet_time_id">
   <option value="">Choose...</option>
   <option value="1">Varies</option>
   <option value="2">Breakfast</option>
   <option value="3">Morning</option>
   <option value="4">Lunch</option>
   <option value="5">Afternoon</option>
   <option value="6">After Work</option>
   <option value="7">Dinner</option>
   <option value="8">Evening</option>
   </select>
   */
  append('meeting_time_id', timeToID(group['Meeting Time']));
  function timeToID(time) {
    switch (time) {
      case 'Varies with activity':
      case 'Morning, noon, and night':
      case 'vary':
        return '1'; // varies
      case '9am':
      case '9:30 am to 11 am':
        return '3'; // morning
      case 'TBD':
      case 'T.B.D':
        return '';
      case '4:00pm - 6:30pm':
      case '5:30-6:45 and/or 4:30-6:45.':
        return '7'; // dinner
      case '10:30am.= 2pm':
      case '10:00a.m.to12:00 p.m.':
        return '4'; // lunch
      case '1:30 pm to 3:30 pm':
      case '2:00pm to 4:30pm':
      case '12:00 to 1:00 p.m.':
        return '5'; // afternoon
      case '4:00 p.m. until games end':
        return '6'; // after work
      default:
        return '8'; // evening
    }
  }

  console.log(data);

  api.hitAPI({
    method: 'POST',
    url: api.root + 'api.php?srv=create_group',
    form: data
  }, function(err, httpResponse, body) {
    if (err) {
      return console.error('Upload failed:', err);
    }
    // console.log('Upload successful!  Server responded with:', body);
    if (groups.length > 0) {
      console.log('remaining: ', groups.length);
      createOne(groups.shift());
    }
  });

}

function categoryToID(cat) {
  switch (cat.split(':')[0]) {
    case 'Activity':
      return '1';
    case 'Discussion':
      return '2';
    case 'Care':
      return '3';
    case 'Code Red':
      return '4';
    case 'NextGen':
      return '5';
    default:
      return 'NONE';
  }
}

function forToID(cat) {
  switch (cat) {
    case 'Men':
      return '1';
    case 'Women':
      return '2';
    case 'Co-Eds':
      return '3';
    case 'Students':
      return '4';
    default:
      return 'NONE';
  }
}
