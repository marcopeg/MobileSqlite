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
	 * Run a query on the active database.
	 * return a jQuery.promise object so you can attach multiple callbacks
	 * it accept standard callbacks but they are attached vie DFD
	 */
	SQLite.prototype.query = function(cfg) {
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		this.db.transaction(function(tx) {
			tx.executeSql(cfg.query, cfg.data, function(tx, r) {
				dfd.resolveWith(cfg.context, [r, cfg, tx, true, dfd]);
			}, function(tx, e) {
				dfd.rejectWith(cfg.context, [e, cfg, tx, false, dfd]);
			});
		});
		
		return dfd.promise();
	}
	
	
	/**
	 * Executes a lot of queries toghether and solve a DeferredObject
	 * when all queries have been executed.
	 *
	 * - it doesn't grant execution order
	 * - it doesn't matter if single query success or fails
	 *
	 */
	SQLite.prototype.multi = function(queries, cfg) {
		
		// strong type recognising
		if (cfg === true) cfg = {quequed:true}
		
		// "quequed" option will demand queries execution to the proper method
		var cfg = $.extend({}, {quequed:false}, this.configQuery(cfg));
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// quequed multi query have it's own method!
		if (cfg.quequed) {
			this.multiq(queries, cfg).done(function() {
				dfd.resolveWith(this);
			}).fail(function() {
				dfd.rejectWith(this);
			});
		
		// non quequed multi query implementation
		} else {
			var _queries = 0;
			var _success = [];
			var _failure = [];
			
			for (var i=0; i<queries.length; i++) {
				_queries++;
				this.query(queries[i]).done(function(r, cfg) {
					_success.push(cfg.query);
					
				}).fail(function() {
					_failure.push(cfg.query);
				
				// check to determine the ending of queries execution!
				}).always(function() {
					_queries--;
					if (_queries == 0 && i>=queries.length-1) {
						dfd.resolveWith(this, [_success, _failure]);
					}
					
				});
			}
			
			// solve an empty queries array... may be an error of a stupid dev!
			if (!queries.length) {
				dfd.resolveWith(this, [_success, _failure]);
			}
		}
		
		
		
		return dfd.promise();
	}
	
	
	
	/**
	 * Executes a lot of queries toghether and solve a DeferredObject
	 * when all queries have been executed.
	 *
	 * - it grant query given order to be mantained
	 * - it doesn't matter if single query success or fails
	 * 
	 */
	SQLite.prototype.multiq = function(queries, cfg) {
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		var _step	 = 0;
		var _success = [];
		var _failure = [];
		
		// step logic
		// go to the next step when query ends execution
		var _doStep = function() {
			var query = queries[_step];
			this.query(query).done(function() {
				_success.push(query);
				
			}).fail(function() {
				_failure.push(query);
			
			// determine the end of the queque or setup next step
			}).always(function() {
				if (_step >= queries.length-1) {
					dfd.resolveWith(this, [_success, _failure]);
				} else {
					_step++;
					_doStep.call(this);
				}
			});
			
		}
		
		// startup multiple query execution!
		if (queries.length) {
			_doStep.call(this);
		} else {
			dfd.resolveWith(this, [_success, _failure]);
		}
		
		return dfd.promise();
	}
	
	
});