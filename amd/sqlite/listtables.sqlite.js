/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 *
 */

define(['./class.sqlite'], function(SQLite) {
	
	
	/**
	 * List al database tables as an array of table names
	 */
	SQLite.prototype.listTables = function(cfg) {
		//this.log('listTables');
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// action
		this.find({
			query: "SELECT * FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'"
		
		// success
		}).done(function(r, tx) {
			var tables = [];
			for (var i=0; i<r.length; i++) {
				tables.push(r[i].name);
			}
			dfd.resolveWith(cfg.context, [tables, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
});