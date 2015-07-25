# Installing

Fork then clone this repository down locally:

	git clone git@github.com:YOUR_USERNAME/journey-groups.git

Make sure you have installed NodeJS:

	http://nodejs.org/download/

Install its dependencies:

	npm install
	bower install

Copy the configuration JSON file, and update it with your CCB credentials:

	cp server/config.sample.json server/config.json
	open server/config.json

# Importing

To import e/groups from their Google Spreadsheet to CCB, please:

	Follow the steps for "Installing" above.
	Export the spreadsheet as groups.csv, and save that file in to this directory.
	In a terminal, `cd` in to this directory, then run `node import.js`.

# Running

	node app.js

# Deploying

Learn about setting up Heroku:

	https://devcenter.heroku.com/articles/getting-started-with-nodejs

Then:

	heroku login
	heroku create
	git push heroku master
