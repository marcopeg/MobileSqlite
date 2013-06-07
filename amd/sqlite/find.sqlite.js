/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 *
 */

define(['./class.sqlite'], function(SQLite) {
	
	
	SQLite.prototype.list = function(cfg) {
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
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
	
	SQLite.prototype.first = function(cfg) {
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
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
	
	
	/**
	 * It execute a callback at each results of a given query.
	 * callback should return a DFD object so execution of
	 * the next callback depends on solution ot the DFD!
	 */
	SQLite.prototype.each = function(query, callback) {
		
		var cfg = $.extend({}, {
			before:			function() {},
			after:			function() {},
			iterator:		__SQLite__eachIterator
		}, this.configQuery(query));
		
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// apply explicit callback to local configuration
		if (typeof callback == 'function') cfg.iterator = callback;
		
		// action
		this.list({
			query:cfg.query,
			data:cfg.data
		
		// success
		}).done(function(r, tx) {
			
			var _this 		= this;
			var _stepDfd 	= $.Deferred();
			
			// callback "before"
			$.when(cfg.before.call(_this, r)).then(function() {
				__SQLite__eachStepLogic.call(_this, _stepDfd, cfg, r, 0);	
			});
			
			// callback "after"
			_stepDfd.always(function() {
				$.when(cfg.after.call(_this, r)).then(function() {
					dfd.resolveWith(cfg.context, [r, tx, true, dfd]);
				});
			});
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
				
		return dfd.promise();
	}
	
	
	/**
	 * each()'s iteration step:
	 * run iterator callback waiting for it's DFD to be solved before
	 * move to the next step!
	 */
	var __SQLite__eachStepLogic = function(_D, cfg, results, step) {
		$.when(cfg.iterator.call(this, results[step], step, results)).then($.proxy(function() {
			if (step >= results.length-1) {
				_D.resolveWith(this);
			} else {
				__SQLite__eachStepLogic.call(this, _D, cfg, results, step+1);
			}	
		},this));
	}
	
	
	/**
	 * each()'s iteration step callback.
	 * just declared as self documentation method!
	 */
	var __SQLite__eachIterator = function(item, i, results) {
		var _D = $.Deferred();
		
		// ... do complex stuff, sub iterations, expensive queries ...
		_D.resolve();
		
		return _D.promise();
	}
	
});