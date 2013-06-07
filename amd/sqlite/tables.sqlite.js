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
			dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, false, tx, dfd]);
			
		});
		
		return dfd.promise();
	};
	
	
	
	
	/**
	 * Remove a table and it's contents from database
	 */
	SQLite.prototype.dropTable = function(cfg) {
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// action
		this.list({
			query: "DROP TABLE " + cfg.query
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, true, tx, dfd]);
			
		});
		
		return dfd.promise();
	};
	
	
	
	
	
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
		this.query({
			query: "DELETE FROM " + cfg.query
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, true, tx, dfd]);
			
		});
		
		return dfd.promise();
	};


	
	
	
	
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
		this.list({
			query: "SELECT * FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'"
		
		// success
		}).done(function(r, tx) {
			var tables = [];
			for (var i=0; i<r.length; i++) {
				tables.push(r[i].name);
			}
			dfd.resolveWith(cfg.context, [tables, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, true, tx, dfd]);
			
		});
		
		return dfd.promise();
	};
	
	
	
	
});