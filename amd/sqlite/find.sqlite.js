/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 *
 */

define(['./class.sqlite'], function(SQLite) {
	
	
	SQLite.prototype.find = function(cfg) {
		if (!this.db) return;
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// action
		this.query({
			query: 	cfg.query,
			data:	cfg.data
		
		// success
		}).done(function(r, tx) {
			
			// fetch all rows as plain array of objects
			var rows = [];	
			for ( var i=0; i<r.rows.length; i++ ) {
				rows.push( r.rows.item(i) );
			}
			
			dfd.resolveWith(cfg.context, [rows, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
	SQLite.prototype.findFirst = function(cfg) {
		if (!this.db) return;
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// action
		this.query({
			query:cfg.query,
			data:cfg.data
		
		// success
		}).done(function(r, tx) {
			
			// fetch first row as return value
			if (r.rows.length) {
				r = r.rows.item(0);
			} else {
				r = [];
			}
			
			dfd.resolveWith(cfg.context, [r, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
});