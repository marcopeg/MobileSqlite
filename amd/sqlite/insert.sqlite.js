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
	
	SQLite.prototype.insert = function(fields, table, cfg) {
		
		// switch to "insertMany" if an array of items was given
		if ($.isArray(fields)) return this.insertMany(fields, table, cfg);
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// action
		this.query({
			query:__SQLite__buildInsertSql(fields, table)
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	};
	
	
	SQLite.prototype.insertMany = function(items, table, cfg) {
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		if (!$.isArray(items)) {
			items = [items];
		}
		
		if (items.length) {
			var results = [];
			__SQLite__insertManyStep(items, table, 0, results, dfd, this);
		} else {
			dfd.rejectWith(this);
		}
		
		return dfd.promise();
	};
	
	
	var __SQLite__buildInsertSql = function(fields, table) {
		var l1 = '';
		var l2 = '';
		
		$.each(fields, function(key, val) {
			l1 += key+',';
			l2 += '\'' + val.replace(/\'/g, "''") + '\',';
		});
		
		return 'INSERT INTO ' + table + ' (' + l1.substr(0, l1.length-1) + ') VALUES (' + l2.substr(0, l2.length-1) + ')';
	};
	
	
	var __SQLite__insertManyStep = function(items, table, step, results, dfd, _class) {
		_class.insert(items[step], table).always(function(r) {
			results.push(r);
			if (step >= items.length-1) {
				dfd.resolveWith(_class, [results]);
			} else {
				__SQLite__insertManyStep(items, table, step+1, results, dfd, _class);
			}
		});
	};
	
});