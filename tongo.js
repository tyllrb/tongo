

var Tongo = {

	/* Dependencies */
	mongo: require ('mongodb').MongoClient,
	crypto: require('crypto'),
	async: require('async'),

	/* Client object */
	mongodb: null,
	/* Query object, holds the query parameters */
	query: {},
	/* Defines a document that can be reused for inserting into a collection */
	templates: {},
	/* Simple cache. */
	cache: {},

	/* Flush the query object of old values */
	clear: function () {
		/* Projections are conditions for what certain fields should be, works similiar to a WHERE statement */
		this.query.projections = null;
		/* The fields to get from the document being queried */
		this.query.filter = null;
		/* When performing an update, the fields that will be modified */
		this.query.updateFields = null;
		this.query.limit = 0;
		this.query.order = 0;
		this.query.pageOffset = 0;
		this.query.single = false;
		this.query.orderField = null;
		this.query.addToArray = null;
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

	model: function (name, object) {
		this.templates [name] = object;
	},

	use: function (name, func) {
		this [name] = func;
	},

	single: function () {
		this.query.single = true;

		return this;
	},

	fork: function (name) {
		this.query.workingDocument = (name in this.templates) ? JSON.parse(JSON.stringify(this.templates [name])) : null;

		return this;
	},

	post: function (object) {
		if (this.query.workingDocument == null) 
			this.query.workingDocument = object;

		for (var field in this.query.workingDocument) {
			if (this.query.workingDocument [field] == '$timestamp') 
				this.query.workingDocument [field] = Math.floor(Date.now() / 1000);

			else if (this.query.workingDocument [field] == '$id') 
				this.query.workingDocument [field] = Math.random().toString(36).substring(2, 12);

			else if (field in object) 
				this.query.workingDocument [field] = object [field];
		}

		return this;
	},

	put: function (object) {
		this.query.updateFields = {};
		var addFields = {};
		var pushFields = {};
		var removeFields = {};

		for (var field in object) {
			var parse = field.split(':');

			if (parse.length > 1) {
				switch (parse [1]) {
					case 'add':
						addFields[parse [0]] = object [field];
						delete object [field];
						break;

					case 'push':
						pushFields[parse [0]] = object [field];
						delete object [field];
						break;

					case 'remove': 
						removeFields[parse [0]] = object [field];
						break;
				}
			}

			else
				this.query.updateFields ['$set'] = object;
		}

		if (Object.keys(addFields).length)
			this.query.updateFields ['$addToSet'] = addFields;

		if (Object.keys(pushFields).length)
			this.query.updateFields ['$push'] = pushFields;

		if (Object.keys(removeFields).length)
			this.query.updateFields ['$pull'] = removeFields;

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
				
				self.async.each(collections, processQuery, function () {
					self.clear();
					resolve(results);
				});

				function processQuery(collection, finished) {
					if (self.query.workingDocument) {
						//console.log.log("Doing an insert");
						////console.log.log("Inserting " + JSON.stringify(self.query.workingDocument) + " into " + collection);
						self.mongodb.collection (collection).insert(self.query.workingDocument, function (error, result) {
							if (error || !result)
								console.log("ERROR (0x100 Could not execute query) " + error);

							results [collection] = self.query.workingDocument;
							return finished(null);
						});
					}

					else if (self.query.updateFields) {
						//console.log.log("Doing an update");
						//console.log.log(query);
						self.mongodb.collection (collection).update(self.query.filter, self.query.updateFields, function (error, result) {
							if (error || !result) 
								console.log("ERROR (0x100 Could not execute query) " + error);

							else {
								self.mongodb.collection (collection).find(self.query.filter).limit(10).toArray(function (error, updatedDoc) {
									if (error || !updatedDoc) 
										console.log("ERROR fetching recent inserted document");

									else {
										if (updatedDoc.length > 1)
											results [collection] = updatedDoc;
										else
											results [collection] = updatedDoc [0];
									}

									return finished(null);
								});
							}
						});
					}
				}
			}
		);
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
						break;

					case 'hash':
						//////console.log.log(parse[0] + " ==> md5(" + query [field] + ") equals " + self.crypto.createHash ('md5').update (query [field]).digest ('hex'));
						criteria [parse [0]] = self.crypto.createHash ('md5').update (query [field]).digest ('hex');
						break;

					case 'ignoreCase':
						criteria [parse [0]] = query [field];
						break;
				}
			}

			else 
				criteria [field] = query [field];
		}
		
		this.query.filter = criteria;
		return this;
	},

	limit: function (amount) {
		var parseAmount = parseInt(amount);

		if (parseAmount > 0)
			this.query.limit = parseAmount;

		return this;
	},

	page: function (pageOffset) {
		this.query.pageOffset = pageOffset;

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
				var results = {};
				
				self.async.each(collections, processQuery, function () {
					self.clear();
					resolve(results);
				});

				function processQuery(collection, finished) {
					if (self.query.single) {
						self.mongodb.collection (collection).findOne(self.query.filter, { fields: self.query.projections }, function (error, result) {
							if (error || !result) {
								console.log ("ERROR (x101 Could not execute query) " + error);
								results [collection] = false;
							}

							else
								results [collection] = result;
							
							return finished(null);
						});
					}

					else {
						self.mongodb.collection (collection).find(self.query.filter, { fields: self.query.projections }).limit(self.query.limit).sort(self.query.order).skip(self.query.limit * self.query.pageOffset).toArray(function (error, result) {
							if (error || !result) {
								console.log("ERROR (x101 Could not execute query) " + error);
								results [collection] = false;
							}

							else
								results [collection] = result;
							
							return finished(null);
						});
					}
				}
			}
		);
	}
}

var Cache = {

	cache: {},
	cacheLimit: 100,

	add: function (field, value) {
		var fields = Object.keys(cache);

		if (fields.length >= cacheLimit) {
			delete cache [fields [0]];
		}

		cache [field] = value;

		console.log(cache);
	},

	has: function (field) {
		return cache [field];
	}

}

module.exports = Tongo;



