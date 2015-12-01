var Tongo = require('./tongo');

Tongo.connect({
	'user': 'admin',
	'password': 'password',
	'server': 'ds047692.mongolab.com:47692',
	'database': 'pplspets'
})
.then (function () {

	Tongo.get('*').single().from('users').then(function (data) {
		console.log(data);
	});

});