SQLite Class
=================

SQLite provides a lot of **useful APIs to solve common WebDB** stuff with ease!

    // Just fiew lines to setup a database and run a select!
    window.db = new SQLite('myDb');
    db.ready().list("SELECT * FROM users").done(function(users) {
       console.log(users);
    });






## Using DeferredObject

WebDB offers a total asynchronous API so may be difficult to chain actions one after another.

I used *jQuery's Deferred Object* in every API method so you can enjoy `$.when().then().pipe()` statement to chain multiple queries or piece of logic.

There are useful apis like `many()` who are able to **run multiple queries** and end function only when all queries have been done. This make so easy to work with WebDB.

**IMPORTANT:** In these pages I will use "function XXX returns ..." meaning some values are given to the `$.then()` callbacks!




## Connection Cycle

I spent much time on **initialization cycle** who is responsible to connect to the db and say to the world "ok, i'm ready to work!".

Within initialization cycle you are able to:

- **syncronize database with a declared schema**, this builds new tables for you, drop unnecessary tables and add new fields to existing tables
- perform **startup data-entry** to populate tables at first execution
- handle **version migration with real ease** defining lists of queries to run and pre/post version logic via custom callbacks

You can define these behavior in your initialization configuration object:

    window.db = new SQLite({
      
      name: 'MyDb',
      
      // build tables
      // you can change at anytime, database updates automagically
      schema: [{
      	name: 'users',
      	fields: [
      	  {name: 'id', type: 'INTEGER', autoincrement: true, primary: true},
          {name: 'name', type: 'VARCHAR', len: 50},
          {surname: 'name', type: 'VARCHAR', len: 50}
      	]
      }],
      
      // fill with startup data
      onAfterCreate: function() {
        var dfd = $.Deferred();
        
        this.insertMany([
          {name: 'Marco', surname: 'Pegoraro'},
          {name: 'Mario', surname: 'Rossi'}
        ], 'users').done(function() {
          dfd.resolve();
        });
        
        return dfd.promise();
      },
      
      // a change of version delete all users records...
      versions: [{
	      match: 	'0',
	      set:		'1',
	      onBefore: function() {this.truncateTable('users')}
      }]
      
    });






## Basic API

Basic APIs allow you to access data with a full Deferred Object logic so you can chain actions togheter enjoing uniform result API.

### query()

Run a simple query and return a _WebDB ResultSet_ object.

### many()

Run multiple queries, returns a list of _WebDB ResultSet_ objects when all queries solves.

### manyq()

It works like `many()` but grant queries execution order.  
The second query begin as far as first query solves.

### list()

It espect a `SELECT` statement and return an array of data objects.

### first()

It espect a `SELECT` statement and return the first object.

### each()

It work much like `list()` but you can setup an _iterator()_ method to run on each
result in results order.

Each iteration starts as far as previous iteration ends.

**This method is incredible useful to run sub-queries!**

### insert()

Allow to create `INSTERT` statement from objects:

    db.ready().insert({
      name: 'Marco',
      surname: 'Pegoraro
    }, 'users').done(function() {
      console.log('new user was added');
    });

### insertMany()

Allow to insert an array of object into the table.





## Tables API

### createTable()

It create a new table from a _schema object_:

    db.ready().createTable({
      name: 'users',
      fields: [
        {name: 'id', type: 'INTEGER', autoincrement: true, primary: true},
        {name: 'name', type: 'VARCHAR', len: 50},
        {surname: 'name', type: 'VARCHAR', len: 50}
      ]
    }).done(function() {
      console.log('table was created');
    });


### dropTable()

### truncateTable()

### listTables()

### describeTable()

### addColumn()






## Advanced Behaviors

### Schema Syncronization

### Version Migrator Utility
