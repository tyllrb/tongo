# tongo

Node library that adds some tasty syntax sugar to mongodb. Use chaining and promises to string together long complex queries. 

# Examples

## Connecting

Connecting is pretty straightforward

```javascript
var Tongo = require('tongo');

Tongo.connect({
	'user': 'username',
	'password': 'the_password',
	'server': 'mongo.server.com',
	'database': 'the_database'
})
.then(function () {
	
	// connection was success

})
.catch(function (error) {
	
	// hmm some error occured connecting

});
```

## How to get things from the database

### GET
Use ```get``` and ```from``` to get the values of specific fields from a collection. Use ```*``` to get all the fields. Note that ```from``` must be the last call on the chain, it is the function that returns the promise. 

```javascript
Tongo.get(
	'username',
	'userId',
	'pic'
)
.from('users')
.limit(5)
.then(function (data) {
	
	//do something with data

})
```

### WHERE
Use ```where``` to get fields based on certain conditional values. You can include as many conditions as you like. 

```javascript
Tongo.get(
	'username',
	'userId',
	'pic'
)
.where({'username': 'Tyler'})
.from('users')
.then(function (data) {
	
	//do something with data

});
```

#### WHERE operations
You can specify certain operations for the fields specified in ```WHERE```. 

* ```:hash``` will hash the value you are passing in
* ```:any``` is used for fields with arrays, checks to see if the value(s) you have passed in is found in the array

Example:
```Javascript
Tongo.get(
	'*'
)
.where({'password:hash': password, 'friendList:any': 'Bob'})
.from('users')
```

#### Multiples!
You can also ```get``` from multiple collections at once. Using ```get``` and ```where``` can act as a basic joining of two datasets from different collections. 

```javascript
Tongo.get(
	'username',
	'userId',
	'comment',
	'pic'
)
.where({'username': 'Tyler'})
.from('users', 'comments')
.then(function (data) {

	//do something with data
	
});
```

Here the ```data``` will be an object with a field for the results of getting ```'users'```, and a field for the results of getting ```'comments'```.

### GET single record
Use ```single``` to query for a single document, useful for when you are expecting just one result.

```javascript
Tongo.get(
	'username',
	'userId',
	'pic'
)
.single()
.where({'username': 'Tyler'})
.then(function (data) {
	
	// do something with data

});
```

### Paging
Use ```page``` and ```limit``` to jump forward in the data by a certain amount. Fetching 3 documents on page 0 will get you the first 3 documents, fetching 3 documents on page 1 will get you the 3rd, 4th, and 5th document, fetching 3 documents on page 2 will get you the 6th, 7th, and 8th record, and so on. Useful for implementing paging controls in your UI. 

```javascript
Tongo.get(
	'username',
	'userId',
	'pic'
)
.limit(3)
.page(1)
.from('users')
.then(function (data) {
	
	// you got the 3rd, 4th, and 5th user

});
```

### Sorting
Use either ```ascending()``` or ```descending()``` in the chain to get your results in those respective orders


## Stuffing things into the database

In accordance with REST verbs, ```put``` is used to update a document, and ```post``` is used for creating a new document. ```into``` is used to specify which collection these modifications will be made, note that ```into``` is the last call on the chain, it is the function that returns the promise for the entire query. 

### PUT
Use ```put```, ```where``` and ```into``` to update a document with new values. You can modify an existing field, or add an entire new one. Note that ```put``` must have a corresponding ```where``` in order to work. 

```javascript
Tongo.put({
	'username': 'Tyler2', // will update the username field with a new value
	'newFied': 'Hello' // this is an entirely new field inserted into the document
})
.where({'username': 'Tyler'})
.into('users')
.then(function (data) {
	
	// data will be the updated document

});
```

#### PUT array operations
Performing array operations is pretty basic, use ```:add``` to add something to the array and ```:removed``` to remove it. For example, say you have a 'like' array that holds the usernames of those who have 'liked' something. Here is how you would add a new username to that list:

```javascript
Tongo.put({
	'likes:add': username
})
.where({'postId': postId})
.into('posts')
.then(function (data) {
	
	// data will be the updated document

});
```

### POST new document
Use ```post``` and ```into``` to create a new document in a specified collection. Like using ```where```, multiple collections can be specified. 

```javascript
Tongo.post({
	'username': 'New_User :)'
})
.into('users')
.then(function (data) {
	
	// data will be the newly created document

});
```

#### POST aliases
There are few aliases you can use to generate certain values. 

* ```$timestamp``` will generate a UNIX timestamp 
* ```$id``` will generate a random string

Heres how to use them:

```javascript
Tongo.post({
	'username': 'Bob',
	'date_joined': '$timestamp',
	'userId': '$id'
})
.into('users');
```

