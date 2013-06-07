/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 * this module supply a method to run logic when database
 * connection cycle ends with success.
 *
 * So you can write something like this:
 * SQLiteInstance.ready().find('SELECT ...').done(...)
 *
 * Or run custom logic this way:
 * SQLiteInstance.ready(function() {
 *   ... your custom stuff ...
 *   this.find(...).done(...);
 * });
 *
 */

define(['./class.sqlite'], function(SQLite) {
	
	
	/**
	 * API Method
	 */
	SQLite.prototype.ready = function(callback) {
		// execute a callback logic when connection ends
		if (typeof callback == 'function') {
			var _D 		= $.Deferred();
			var _this 	= this;
			this.Conn.done(function() {
				$.when(callback.call(_this)).then(function() {
					_D.resolveWith(_this);
				});
			});
			return _D.promise();
		
		// return an instance of deferred API methods
		} else {
			if (!this._ready) this._ready = new __SQLite__ready(this);
			return this._ready;
		}
	};
	
	
	
	
	
	
	
	/**
	 * Connection deferred utility methods
	 */
	var __SQLite__ready = function(_class) {
		this.obj = _class;
	};
	
	
	__SQLite__ready.prototype.bypass = function(_api, _args) {
		var _A = _args;
		var _B = this.obj;
		var _D = $.Deferred();		
		
		_B.ready(function() {
			$.when(_B[_api].apply(_B, _A)).always(function(r, cfg, _is_, tx, dfd) {
				if (_is_) {
					_D.resolveWith(_B, [r, cfg, _is_, tx, dfd]);
				} else {
					_D.rejectWith(_B, [r, cfg, _is_, tx, dfd]);
				}
			});
		});
		
		return _D.promise();
	};
	
	
	__SQLite__ready.prototype.query = function() {
		return this.bypass('query', arguments);
	};
	
	__SQLite__ready.prototype.multi = function() {
		return this.bypass('multi', arguments);
	};
	
	__SQLite__ready.prototype.multiq = function() {
		return this.bypass('multiq', arguments);
	};
	
	__SQLite__ready.prototype.list = function() {
		return this.bypass('list', arguments);
	};
	
	__SQLite__ready.prototype.first = function() {
		return this.bypass('first', arguments);
	};
	
	__SQLite__ready.prototype.each = function() {
		return this.bypass('each', arguments);
	};
	
	__SQLite__ready.prototype.createTable = function() {
		return this.bypass('createTable', arguments);
	};
	
	__SQLite__ready.prototype.dropTable = function() {
		return this.bypass('dropTable', arguments);
	};
	
	__SQLite__ready.prototype.listTable = function() {
		return this.bypass('listTable', arguments);
	};
	
	__SQLite__ready.prototype.truncateTable = function() {
		return this.bypass('truncateTable', arguments);
	};
	
	__SQLite__ready.prototype.describeTable = function() {
		return this.bypass('describeTable', arguments);
	};
	
});