/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 * Syncronyze single table schema
 *
 * Today only new fields are added to the table.
 * 
 * We may change this implementation using a temporary table 
 * where to build new modified schema and to fill with actual data!
 * this may be more expensive but should allow a real table editing!
 *
 */

define(['jquery', './class.sqlite'], function($, SQLite) {
	
	SQLite.prototype.checkTableSchema = function(table) {
		var dfd = new $.Deferred();
		
		//this.log('Sync Schema: ' + table);
		
		// Identify relative schema inside database schema conficuration
		var declaredFields = this.getTableConfigFields(table);
		var existingFields = [];
		var existingFieldNames = [];
		
		var step1 = new $.Deferred();
		
		// STEP1: remove fields who are not present into schema
		this.describeTable(table).done(function(fields) {
			existingFields = fields;
			
			for (var i=0; i<existingFields.length; i++) {
				existingFieldNames.push(existingFields[i].name);
			}
			
			// DROP FIELD does not exists in SQLite so we can't perform
			// any action here!
			
		}).always(function() {
			step1.resolveWith(this);
		});
		
		// STEP2: add new fields to the table
		step1.done(function() {
			for (var i=0; i<declaredFields.length; i++) {
				if (existingFieldNames.indexOf(declaredFields[i].name) == -1) {
					this.addColumn(declaredFields[i], table);
				}
			}
			dfd.resolveWith(this);
		});
		
		return dfd.promise();
	}
	
});