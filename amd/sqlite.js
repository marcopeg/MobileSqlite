/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 * this file loads layer modules and apply default configuration to the
 * main object class.
 * 
 * Export the entire object as AMD module
 *
 */
define([
	'jquery',
	
	// Class definition file
	'./sqlite/class.sqlite',
	
	// method - mudules - complex properties
	'./sqlite/connect.sqlite',
	'./sqlite/query.sqlite',
	'./sqlite/find.sqlite',
	'./sqlite/listtables.sqlite',
	'./sqlite/describetable.sqlite',
	'./sqlite/createtable.sqlite',
	'./sqlite/droptable.sqlite',
	'./sqlite/truncatetable.sqlite',
	'./sqlite/addcolumn.sqlite',
	'./sqlite/checkschema.sqlite',
	'./sqlite/checktableschema.sqlite',
	'./sqlite/checkversion.sqlite'
	
], function(
	$,
	SQLite
	
) {
	
	
	/**
	 * Apply default configuration to the instance
	 */
	SQLite.prototype.initialize = function(cfg) {
		this.config = $.extend({}, {
			
			// database connection informations
			name:		'SqlDbName',
			desc:		'another sql database',
			version:	'',	// should be left empty to load any db version and apply versionin rules automagically
			size:		10, // Mb
			
			
			debug:				true, // show or hides logging utilities
			autoConnect:		true,
			connCheckDelay:		10,		// define delay to check and setup "created" property after db connection
			
			// callbacks
			// (should return a DeferredObject to stop work flow untill callback logic end)
			onConnect:			function() {}, // called ad every connection
			onCreate: 			function() {}, // called only at database creation time!
			onAfterCreate:		function() {}, // used to populate some data when creating a new database
			onReady:			function() {}, // last callback for database setup & connection process
			onConnectionError: 	function() {}, // if connection fails
			
			// stores database tables and fields.
			// is checked up ad db opening and serve to maintain up to date database structure.
			// SQLite.checkSchema()
			schema: [],
			
			// apply a change of version for the database.
			// each version step should declare queries to run or detailed logc function.
			// SQLite.checkVersion()
			versions: []
			
		}, cfg||{});
	}
	
	
		
	// export module
	return SQLite;
	
});