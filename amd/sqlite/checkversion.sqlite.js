/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 *
 */

define(['jquery', './class.sqlite'], function($, SQLite) {
	
	SQLite.prototype.checkVersion = function() {
		var dfd = new $.Deferred();
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		//this.log('checkversion');
		var _step		= 0;
		var _error		= false;
		
		
		// step through versioning items logic
		var _doStep = function() {
			//this.log("STEP: " + _step);
			this.applyVersion(this.config.versions[_step]).done(function() {
				// setup next step
				if (_step < this.config.versions.length-1) {
					_step++;
					_doStep.call(this);
					
				// last step, resolve dfd
				} else {
					dfd.resolveWith(this);
					
				}
			
			// if a step fail then no other versioning step should be done!
			}).fail(function(e) {
				dfd.rejectWith(this, [e]);
			});
		};
		
		// startup versioning cycle
		if (this.config.versions.length) {
			_doStep.call(this);
		} else {
			dfd.resolveWith(this);
		}
		
		return dfd.promise();
	}
	
	
	
	
	SQLite.prototype.applyVersion = function(version) {
		var dfd = new $.Deferred();
		
		// apply defaults to version configuration
		version = $.extend({}, {
			match: 		'',
			set:		'',
			query: 		[],
			quequed: 	false,
			onBefore:	function() {},
			onAfter:	function() {}
		}, version);
		
		
		var _error = function(e) {
			dfd.rejectWith(this, [e]);
		}
		
		// new version success, chain migrating actions:
		// - callback "onBefore"
		// - execute queries
		// - callbacl "onAfter"
		var _success = function() {
			$.when(version.onBefore.call(this)).then($.proxy(function() {
				this.multiQuery(version.query, {quequed:version.quequed}).always($.proxy(function() {
					$.when(version.onAfter.call(this)).then($.proxy(function() {
						dfd.resolveWith(this);	
					}, this));	
				},this));
			},this));
		}
		
		// apply new version and throw callbacks
		if (this.db.version == version.match) {
			this.db.changeVersion(version.match, version.set, null, $.proxy(_error,this), $.proxy(_success,this));
		} else {
			dfd.resolveWith(this);
		}
		
		return dfd.promise();
	}
	
});