// TODO: Split the API methods out in to the server folder.
var express = require('express'),
	connect = require('connect'),
	moment = require('moment'),
	_ = require('lodash'),
	app = express();

var api = require('./server/api'),
	email = require('./server/email'),
	groupCache = require('./server/cache');
groupCache.start();

app.use('/bower_components', express.static('./bower_components'));
app.use(express.static('./app'));

app.use(connect.json());
app.use(connect.urlencoded());

app.post('/query', function(req, res) {
	var body = _.defaults(req.body || {}, {
		type: 'NONE',
		when: 'ANY',
		semester:'e/Group Fall 2015',
		time: 'NONE',
		people: 'NONE',
		ages: 'ANY',
		childcare: false
	});

	var form = {};
	if (body.childcare) { form.childcare = 1; }
	if (body.type !== 'NONE') { form.udf_pulldown_1_id = body.type; }
	if (body.people !== 'NONE') { form.udf_pulldown_2_id = body.people; }
	if (body.ages !== 'ANY') { form.udf_pulldown_3_id = body.ages; }
	if (body.when !== 'ANY') { form.meet_day_id = body.when; }
	if (body.time !== 'NONE') { form.meet_time_id = body.time; }

	api.search(form, function(err, items) {
		items = items.map(function(item) {
			var cached = groupCache.fetch(item.id);
			if (cached) {
				item = _.defaults(item, cached);
			}
			return item;
		});
		return res.send({ success: !err, result: err || items });
	});
});
app.post('/contact', function(req, res) {
	var body = _.defaults(req.body || {}, {
		group_name: '',
		owner_name: '',
		owner_email_primary: '',
		name: '',
		email: '',
		phone: ''
	});
	if (!body.email) {
		return res.send({ success: false, result: 'You must provide an email and a group.' });
	}

	email({
		to: body.owner_email_primary,
		replyTo: body.email,
		subject: '[EGROUPS] ' + (body.name || 'Someone') + ' Wants to Join Your e/group!',
		text: 'Hi ' + body.owner_name + '!\n\n'
		+ (body.name || 'Someone') + ' is interested in joining your e/group! Would you reach out to them as soon as you can to connect with them?\n\n'
		+ '\te/group: ' + body.group_name + '\n'
		+ '\tName: ' + (body.name || 'Not Provided') + '\n'
		+ '\tEmail: ' + body.email + '\n'
		+ '\tPhone: ' + (body.phone || 'Not Provided') + '\n'
		+ '\nHave a great day!'
		+ '\nElevate Life Church'
	}, function(err) {
		return res.send({ success: !err, result: err });
	});
});
app.post('/group', function(req, res) {
	var params = [
		'yourname', 'youremail', 'yourphone',
		'name', 'catalogDescription', 'generalDescription',
		'udf_group_pulldown_1_id', 'udf_group_pulldown_2_id', 'udf_group_pulldown_3_id',
		'meeting_day_id', 'meeting_time_id',
		'meeting_location_street_address', 'meeting_location_city', 'meeting_location_state', 'meeting_location_zip'
	];
	var data = _.defaults(req.body || {});
	for (var i = 0; i < params.length; i++) {
		if (!data[params[i]]) {
			return res.send({ success: false, result: 'Please fill out all fields.' });
		}
	}

	// TODO: Figure out how to look up users in CCB. But until then, hard code the leader to be Brian.
	data.main_leader_id = 581;

	data.meeting_location_state = data.meeting_location_state.toUpperCase();
	switch (data.meeting_location_state) {
		case 'FLORIDA':
			data.meeting_location_state = 'FL';
			break;
		case 'DELAWARE':
			data.meeting_location_state = 'DE';
			break;
		case 'NEW JERSEY':
			data.meeting_location_state = 'NJ';
			break;
		case 'PENNSYLVANIA':
			data.meeting_location_state = 'PA';
			break;
	}
	data.name = '[REVIEW] ' + data.name + ' (' + groupType(data.udf_group_pulldown_1_id) + ')';

	data.description = ''
		+ '\n- Catalog Description: ' + data.catalogDescription
		+ '\n- General Description: ' + data.generalDescription
		+ '\n- Start Time: ' + data.meeting_time_start
		+ '\n- End Time: ' + data.meeting_time_end
		+ '\n- Leader Name: ' + data.yourname
		+ '\n- Leader Email: ' + data.youremail
		+ '\n- Leader Phone: ' + data.yourphone
		+ '\n- Meeting Dates: ' + data.meeting_date
		+ '\n- Coleader Info: ' + data.coleader;

	var creator = {
		name: data.yourname,
		email: data.youremail,
		phone: data.yourphone
	};
	delete data.yourname;
	delete data.youremail;
	delete data.yourphone;

	data.public_search_listed = false;
	data.listed = false;
	data.group_type_id = '1';

	api.hitAPI({
		method: 'POST',
		url: api.root + 'api.php?srv=create_group',
		form: data
	}, function(err, httpResponse, body) {
		if (err) {
			return res.send({ success: !err, result: err });
		}
		if (!body || !body.split || !body.split('<group id="')[1] || !body.split('<group id="')[1].split) {
			return res.send({ success: false, result: 'Creating the group did not succeed! Try again later or contact us, please!' });
		}
		var groupID = body.split('<group id="')[1].split('"')[0];
		if (!groupID) {
			return res.send({ success: false, result: 'Creating the group did not succeed! Try again later or contact us, please!' });
		}
		email({
			replyTo: data.youremail,
			subject: '[EGROUPS] ' + data.name,
			text: 'Hello friend!\n\n'
			+ (creator.name) + ' is interested in starting an e/group! Would you reach out to them as soon as you can to connect with them?\n\n'
			+ '\te/group: ' + data.name + '\n'
			+ '\tEmail: ' + creator.email + '\n'
			+ '\tPhone: ' + (creator.phone || 'Not Provided') + '\n'
			+ '\tCCB Link: ' + api.root + 'group_edit.php?ax=edit&group_id=' + groupID + '\n'
			+ '\nHave a great day!'
			+ '\nElevate Life Church'
		}, function(err) {
			if (err) {
				console.error(err);
			}
			return res.send({ success: true });
		});
	});


});

var server = app.listen(process.env.PORT || 5000, function() {
	console.log('Listening on port %d', server.address().port);
	console.log('http://localhost:' + server.address().port + '/');
});


function groupType(id) {
	id = '' + id;
	switch (id) {
		case '1':
			return 'Encounter -Spiritual Growth';
		case '2':
			return 'Embrace -Connect with Others';
		case '3':
			return 'Elevate -Service/Outreach';
		default:
			return 'e/Group';

	}
}
