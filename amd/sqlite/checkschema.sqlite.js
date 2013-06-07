/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 *
 */

define(['jquery', './class.sqlite'], function($, SQLite) {
	
	/**
	 * Syncronize schema for the entire database
	 */
	SQLite.prototype.checkSchema = function() {
		
		var dfd = new $.Deferred();
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		//this.log('checkschema');
		
		// Setup steps DFD to ensure correct chaining of actions
		var step1 = new $.Deferred();
		var step2 = new $.Deferred();
		var step3 = new $.Deferred();
		
		// STEP1: remove unused tables
		this.listTables().done(function(tables) {
			//this.log('remove unused');
			var remaining = [];
			for (var i=0; i<tables.length; i++) {
				if (__SQLite__checkTableToRemove.call(this, tables[i])) {
					remaining.push(tables[i]);
				}
			}
			step1.resolveWith(this, [remaining]);
		});
		
		// STEP2: create non existing tables
		step1.done(function(tables) {
			//this.log('create non existing');
			var remaining = [];
			for (var i=0; i<this.config.schema.length; i++) {
				if (tables.indexOf(this.config.schema[i].name) == -1) {
					this.createTable(this.config.schema[i]);
				} else {
					remaining.push(this.config.schema[i].name);
				}
			}
			step2.resolveWith(this, [remaining]);
		});
		
		// STEP3: syncronize table's fields
		// may be time expensive when will be implemented 
		// with full temporary table pass-through!
		step2.done(function(tables) {
			//this.log('syncronize table fields');
			var actions = 0;
			for (var i=0; i<tables.length; i++) {
				actions++;
				this.checkTableSchema(tables[i]).always(function() {
					actions--;
					// detect all tables have been synced to solve step3
					if (actions == 0 && i >= tables.length-1) {
						step3.resolveWith(this);
					}
				});
			}
			// solve step event there is no table to update!
			if (!tables.length) step3.resolveWith(this);
		});
		
		// End of schema syncronization
		step3.always(function() {
			//this.log("End Check Schema");
			dfd.resolveWith(this);
		});
		
		return dfd.promise();
	};
	
	
	
	
	/**
	 * PRIVATE
	 * check for a table name to exists 
	 */
	var __SQLite__checkTableToRemove = function(table) {
		
		// check candidate table inside schema
		for (var i=0; i<this.config.schema.length; i++) {
			if (table == this.config.schema[i].name) {
				return true;
			}
		}
		
		// skip protected tables
		var protectedTables = ['sqlite_sequence'];
		if (protectedTables.indexOf(table) != -1) return;
		
		// table wasn't found so is dropped out!
		this.dropTable(table);
	};
	
	
	
	
	
});