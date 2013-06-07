/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 *
 */
define(['jquery'], function($) {
	
	
	/**
	 * Constructor
	 */
	var SQLite = function(cfg) {
		
		this.initialize(cfg);
		
		// WebDb Handler
		this.db = null;
		
		// flag, define if database was created for the very first time
		this.created = false;
		
		// Active connection promising object
		this._Conn 	= new $.Deferred();
		this.Conn 	= this._Conn.promise();
		
		// Do auto connect
		if (this.config.autoConnect) {
			this.connect();
		}
		
		return this;
	};
	
	
	
	
	
	SQLite.prototype.log = function(txt, usealert) {
		if (this.config.debug) {
			if (usealert) {
				alert(txt);
			} else {
				if (typeof txt == 'string') {
					console.log('[SQLite] ' + txt);
				} else {
					console.log(txt);
				}
			}
		}
	};
	
	
	/**
	 * It build up a standard configuration set for quering.
	 * used by: query, find, findAll
	 */
	SQLite.prototype.configQuery = function(cfg) {
		
		if (typeof cfg == 'string') {
			cfg = {query:cfg};
		}
		
		return $.extend({},{
			query: 		'',
			data: 		[],
			success: 	function() {},
			error: 		function() {},
			complete: 	function() {},
			context: 	this
		}, cfg);
	}
	
	
	/**
	 * It compose a new deferred object and bind internal callbacks
	 * from given configuration object.
	 */
	SQLite.prototype.configDeferred = function(cfg) {
		var d = new $.Deferred();
		d.done(cfg.success);
		d.fail(cfg.error);
		d.always(cfg.complete);
		return d;
	}
	
	
	SQLite.prototype.getTableConfig = function(table) {
		for (var i=0; i<this.config.schema.length; i++) {
			if (this.config.schema[i].name == table) {
				return this.config.schema[i];
			}
		}
	}
	
	
	SQLite.prototype.getTableConfigFields = function(table) {
		var schema = this.getTableConfig(table);
		if (schema) {
			return schema.fields;
		} else {
			return [];
		}
	}
	
	
	/**
	 * It take a column (field) configuration object and compose
	 * the piece of sql to rapresent it.
	 */
	SQLite.prototype.columnConfig2Sql = function(field) {
		
		var sql = field.name + ' ' + field.type;
		
		if (field.len != undefined) {
			sql+= '(' + field.len + ')';
		}
		
		if (field.primary != undefined) {
			sql+= ' PRIMARY KEY';
		}
		
		if (field.autoincrement) {
			sql+= ' AUTOINCREMENT';
		}
		
		return sql;
	}
	
	

	// export module
	return SQLite;
	
});