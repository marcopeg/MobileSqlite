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
	 * Remove a table and it's contents from database
	 */
	SQLite.prototype.createTable = function(schema, cfg) {
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// setup CREATE statement
		cfg.query = 'CREATE TABLE ' + schema.name + ' (';
		for (var i=0; i<schema.fields.length; i++) {
			cfg.query+= this.columnConfig2Sql(schema.fields[i]);
			if (i < schema.fields.length-1) {
				cfg.query+= ', ';
			}
		}
		cfg.query+= ')';
		
		this.log(cfg.query);
		
		// action
		this.query({
			query: cfg.query
		
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