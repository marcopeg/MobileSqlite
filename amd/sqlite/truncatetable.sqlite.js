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
	 * Empty a table
	 */
	SQLite.prototype.truncateTable = function(cfg) {
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// action
		this.find({
			query: "DELETE FROM " + cfg.query
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
});