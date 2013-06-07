/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 * Alter table adding one new column at the end of table columns
 *
 */

define(['jquery', './class.sqlite'], function($, SQLite) {
	
	SQLite.prototype.addColumn = function(column, table) {
		var dfd = new $.Deferred();
		
		// action
		this.query({
			query: 	'ALTER TABLE ' + table + ' ADD COLUMN ' + this.columnConfig2Sql(column),
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(this, [true, dfd, r, tx]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(this, [false, dfd, e]);
			
		});
		
		return dfd.promise();
	};
	
});