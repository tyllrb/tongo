var Tongo = require('./tongo');

Tongo.connect({
	'user': 'admin',
	'password': 'password',
	'server': 'ds047692.mongolab.com:47692',
	'database': 'pplspets'
})
.then (function () {

	Tongo.get(
		'username',
		'password',
		'userId'
	)
	.from('users')
	.then(function (result) {
		console.log(result);
	});

});