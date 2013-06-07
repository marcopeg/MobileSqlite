/**
 * ---[[   B O I L E R P L A T E   ]]---
 * JqueryMobile + BackboneJS + RequireJS
 * =====================================
 * 
 * SQLite Abstraction Layer
 * This method is able to retrieve fields schema from an existing table.
 *
 * You can give table's name as single string param to this method.
 */

define(['jquery', './class.sqlite'], function($, SQLite) {
	
	
	SQLite.prototype.describeTable = function(cfg) {
		
		//this.log('listTables');
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// action
		this.first({
			query: "SELECT sql FROM sqlite_master WHERE type='table' AND name = '"+cfg.query+"'"
		
		// success
		}).done(function(r, tx) {
			var fields = __SQLite__fieldsFromSql(r.sql);
			dfd.resolveWith(cfg.context, [fields, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, true, tx, dfd]);
			
		});
		
		return dfd.promise();
	};
	
	
	/**
	 * It take a CREATE statement and parse field's informations schema
	 */
	var __SQLite__fieldsFromSql = function(sql) {
		
		// isolate fields list
		sql = sql.substr(sql.indexOf('(')+1, sql.length);
		sql = sql.substr(0, sql.length-1);
		
		// parse each field statement
		var fieldsStatement = sql.split(',');
		var fields = [];
		var field = null;
		for (var i=0; i<fieldsStatement.length; i++) {
			field = __SQLite__fieldSchema($.trim(fieldsStatement[i]));
			if (field) {
				fields.push(field);
			}
		}
		
		return fields;
	};
	
	
	/**
	 * It take a field definition string from a CREATE statement
	 * and parses it's schema:
	 *
	 * INTEGER AUTOINCREMENT PRIMARY KEY
	 * -> {type: "INTEGER", autoincrement: true, primary: true}
	 *
	 * VARCHAR(20)
	 * -> {type: "VARCHAR", len: 20}
	 */
	var __SQLite__fieldSchema = function(field) {
		
		var info = {
			name: '',
			type: ''
		};
		
		// fetch field name
		info.name = field.substr(0, field.indexOf(" "));
		field = $.trim(field.substr(info.name.length, field.length));
		
		// fetch AUTOINCREMENT
		if (field.indexOf("AUTOINCREMENT") != -1) {
			info.autoincrement = true;
			field = $.trim(field.replace("AUTOINCREMENT", ""));
		}
		
		// fetch PRIMARY KEY
		if (field.indexOf("PRIMARY KEY") != -1) {
			info.primary = true;
			field = $.trim(field.replace("PRIMARY KEY", ""));
		}
		
		// fetch field's type
		var type = field.substr(0, field.indexOf(" "));
		if (!type) type = field;
		type = __SQLite__fieldType(type);
		info.type = type.name;
		if (type.len) info.len = type.len;
		
		if (info.name.length) {
			return info;
		}
		
	};
	
	
	/**
	 * It take a field type string and return info such
	 * name and length.
	 *
	 * INTEGER -> {name:"INTEGER"}
	 * VARCHAR(20) -> {name:"VARCHAR", len:20}
	 */
	var __SQLite__fieldType = function(str) {
		
		var type = {name:''};
		
		// type tring contain (50) or something like this
		// so we need to extract name and length values
		if (str.indexOf('(') > -1) {
			type.name = str.substr(0, str.indexOf('('));
			type.len = parseInt($.trim(str.replace(type.name, "").replace("(", "").replace(")", "")));
		
		// simple field type like "INTEGER"
		} else {
			type.name = str;
		}
		
		return type;
	};
	
});