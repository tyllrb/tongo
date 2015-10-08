

var Tongo = {
	mongo: require ('mongodb').MongoClient,
	mongodb: null,

	query: {},
	templates: {},
	workingDocument: null,

	clear: function () {
		this.query.projections = null;
		this.query.filter = null;
		this.query.updateFields = null;
		this.query.limit = 0;
		this.query.order = 0;
		this.query.orderField = null;
		this.query.justCheck = false;
		this.query.workingDocument = null;
	},

	connect: function (settings) {
		self = this;
		this.clear();

		var serverString = 'mongodb://' + settings.user + ':' + settings.password + '@' + settings.server + '/' + settings.database;
		
		return new Promise (
			function (resolve, reject) {
				self.mongo.connect (serverString, function (error, db) {
					if (error || !db)
						reject();

					else {
						self.mongodb = db;
						resolve();
					}
				});
			}
		);
	},

	template: function (name, object) {
		for (var field in object) {
			if (field == '$timestamp')
				object [field] = Math.floor(Date.now() / 1000);

			else if (field == '$uid') {
				object [field] = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
					var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
					return v.toString(16);
				});
			}

			else if (field == '$counter') {

			}
		}
		this.templates [name] = object;
	},

	fork: function (name) {
		this.workingDocument = (this.templates [name]) ? this.templates [name] : null;

		return this;
	},

	post: function (object) {
		if (this.workingDocument == null) 
			this.workingDocument = object;

		else {
			for (var field in object) {
				this.workingDocument [field] = object [field];
			}
		}

		console.log(this.workingDocument);
		return this;
	},

	put: function (object) {
		this.query.updateFields = {'$set': object};
		return this;
	},

	into: function () {
		var self = this;
		var collections = [];

		for (var i in arguments) {
			collections.push(arguments [i]);
		}

		return new Promise (
			function (resolve, reject) {
				var results = {};
				
				console.log(collections);

				function forEach (list, action, finished) {
					if (list.length == 0) {
						finished ();
						return;
					}

					var item = list.shift();

					action (item, self.query, function (error, data) {
						if (error) 
							reject ();

						else {
							results [item] = data;
							forEach (list, runQuery, finished);
						}
					});
				}

				function runQuery (collection, query, callback) {
					if (self.query.workingDocument) {
						console.log("Inserting " + JSON.stringify(self.workingDocument) + " into " + collection);
						self.mongodb.collection (collection).insert(self.workingDocument, function (error, result) {
							if (error || !result) callback (true);

							else callback (false, result);
						});
					}

					else if (self.query.updateFields) {
						console.log("Updating " + JSON.stringify(self.query.updateFields) + " into " + collection);
						self.mongodb.collection (collection).update(self.query.filter, self.query.updateFields, function (error, result) {
							if (error || !result) callback (true);

							else callback (false, result);
						});
					}
				}

				forEach (collections, runQuery, function () {
					self.clear();
					resolve(true);
				});
			})
	},

	get: function () {
		var buildProjections = {};

		for (var i = 0; i < arguments.length; i++) {
			buildProjections [arguments [i]] = 1;
		}

		this.query.projections = buildProjections;
		return this;
	},

	where: function (query) {
		var parse;
		var criteria = {};
		
		for (var field in query) {
			parse = field.split(':');

			if (parse.length == 2) {
				switch (parse [1]) {
					case 'any':
						criteria [parse [0]] = { $in: query [field] };
						break;

					case 'all':
						criteria [parse [0]] = { $all: query [field] };
				}
			}

			else 
				criteria = query;
		}
		
		this.query.filter = criteria;
		return this;
	},

	limit: function (amount) {
		if (amount > 0)
			this.query.limit = amount; 
		return this;
	},

	ascending: function (field) {
		this.query.order = {};
		this.query.order[field] = 1;

		return this;
	},

	descending: function (field) {
		this.query.order = {};
		this.query.order[field] = -1;

		return this;
	},

	exists: function (criteria) {
		this.query.filter = criteria;
		this.query.justCheck = true;

		return this;
	},

	from: function () {
		var self = this;
		var collections = [];

		for (var i in arguments) {
			collections.push(arguments [i]);
		}

		return new Promise (
			function (resolve, reject) {
				//if (!collections.length) reject ();

				var results = {};

				console.log("---------------");
				console.log("Constructed query: ");
				console.log(self.query);
				console.log("---------------");

				
				function forEach (list, action, finished) {
					if (list.length == 0) {
						finished ();
						return;
					}

					var item = list.shift();

					action (item, self.query, function (error, data) {
						results [item] = data;
						forEach (list, runQuery, finished);
					});
				}

				function runQuery (collection, query, callback) {
					self.mongodb.collection (collection).find(query.filter, { fields: query.projections }).limit(query.limit).sort(query.order).toArray(function (error, result) {
						if (error || !result) callback (true);

						else callback (false, result);
					});
				}

				forEach (collections, runQuery, function () {
					self.clear();
					resolve(results);
				});

				

				/*
				if (self.query.justCheck) {
					mongodb.collection (collection).find(self.query.filter).limit(1).toArray (function (error, result) {
						if (error) reject();
						else if (result.length) resolve (true);
						else resolve (false);
					});
				}

				else {
					mongodb.collection (collection).find(self.query.filter, { fields: self.query.projections }).limit(self.query.limit).sort(self.query.order).toArray(function (error, result) {
						if (error || !result) reject();
						else resolve(result);
					});
				}
		
				[{
					'asd':'asdsa',
					'asda':'asdasd'
				}]

				*/
			}
		);
	}
}

Tongo.template('user', {
	'username': null,
	'password': null,
	'created': '$timestamp',
	'age': null,
	'barcde': '$uid',
	'notifications': null,
	'skills': null,
});



Tongo.connect({
	'user': 'oskar',
	'password': 'password',
	'server': 'ds047901.mongolab.com:47901',
	'database': 'tongotest'
})
.then (function () {

	/*
	Tongo.put({'username': 'Bob'}).where({'userId':2}).into('profiles')
	.then (function (data) {
		console.log(data);
	});*/
});


