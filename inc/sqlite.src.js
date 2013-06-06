;(function($){

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
	
	// global namespace
	window.SQLite = SQLite;
	
	
	/**
	 * Apply default configuration to the instance
	 */
	SQLite.prototype.initialize = function(cfg) {
		this.config = $.extend({}, {
			
			// database connection informations
			name:		'SqlDbName',
			desc:		'another sql database',
			version:	'',	// should be left empty to load any db version and apply versionin rules automagically
			size:		10, // Mb
			
			
			debug:				true, // show or hides logging utilities
			autoConnect:		true,
			connCheckDelay:		10,		// define delay to check and setup "created" property after db connection
			
			// callbacks
			// (should return a DeferredObject to stop work flow untill callback logic end)
			onConnect:			function() {}, // called ad every connection
			onCreate: 			function() {}, // called only at database creation time!
			onAfterCreate:		function() {}, // used to populate some data when creating a new database
			onReady:			function() {}, // last callback for database setup & connection process
			onConnectionError: 	function() {}, // if connection fails
			
			// stores database tables and fields.
			// is checked up ad db opening and serve to maintain up to date database structure.
			// SQLite.checkSchema()
			schema: [],
			
			// apply a change of version for the database.
			// each version step should declare queries to run or detailed logc function.
			// SQLite.checkVersion()
			versions: []
			
		}, cfg||{});
	}
	
	
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
	 * Execute "action" callback just after connection process ends.
	 * callback should block execution implementing DFD.
	 */
	SQLite.prototype.ready = function(action) {
		var dfd = $.Deferred();
		this.Conn.done($.proxy(function() {
			$.when(action.call(this)).then($.proxy(function() {
				dfd.resolveWith(this);
			},this));
		}, this));
		return dfd.promise();
	}
	
	
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
	}
	
	
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
	}
	
	
	
	
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
		
		// table wasn't found so is dropped out!
		this.dropTable(table);
	}
	
	
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
	
	
	
	/**
	 * Connection & Setup Process
	 * - IF CONNECT SUCCESS
	 * --- callback: "onConnect"
	 * --- callback: "onCreate" (only at first connection when db being created)
	 * --- sync schema
	 * --- callback: "onAfterCreate" (only at first connection when db being created)
	 * --- versioning utility
	 * --- callback: "onReady"
	 * - IF CONNECTION FAILS
	 * --- callback: "onConnectionError"
	 *
	 * NOTE: Every callback should return a DeferredObject so each step wait 
	 * previous step to complete.
	 *
	 * Use "onAfterCreate" to apply initial population logic so your database
	 * schema is already created and tables are ready to be used!
	 * 
	 */
	SQLite.prototype.connect = function() {
		//this.log("try to connect");
		
		// reset global connection DeferredObject
		this._Conn 	= new $.Deferred();
		this.Conn 	= this._Conn.promise();
		
		// internal DeferredObjects used to chain initialization steps
		var _createDfd 			= new $.Deferred();		// internal dfd used to know creation status
		var _schemaDfd			= new $.Deferred();		// internal dfd used to know when schema have been synced
		var _versionDfd			= new $.Deferred();		// internal dfd used to know when population callback ends
		var onConnectDfd 		= new $.Deferred();		// callback dfd
		var onCreateDfd 		= new $.Deferred();		// callback dfd
		var onAafterCreateDfd	= new $.Deferred();		// callback dfd
		
		// startup connection!
		try {
			this.db = openDatabase(this.config.name, this.config.version, this.config.desc, this.config.size * 1024 * 1024, $.proxy(function(){this.created=true;},this));
			
			// detect if database was created or not
			setTimeout($.proxy(function() {
				if (this.created) {
					_createDfd.resolveWith(this);
				} else {
					_createDfd.rejectWith(this);
				}
			},this), this.config.connCheckDelay);
			
			// handle onConnect callback
			$.when(this.config.onConnect.call(this)).then($.proxy(function() {
				onConnectDfd.resolveWith(this);
			},this));
			
			// handle onCreate callback
			$.when(onConnectDfd).then($.proxy(function() {
				_createDfd.done(function() {
					$.when(this.config.onCreate.call(this)).then($.proxy(function() {
					onCreateDfd.resolveWith(this);
				},this));
				}).fail(function() {
					onCreateDfd.rejectWith(this);
				});
			}, this));
			
			// running schema syncing utility
			onCreateDfd.always(function() {
				this.checkSchema().always(function() {
					_schemaDfd.resolveWith(this);
				});
			});
			
			// handle onAfterCreate
			_schemaDfd.always(function() {
				if (this.created) {
					$.when(this.config.onAfterCreate.call(this)).then($.proxy(function() {
						onAafterCreateDfd.resolveWith(this);
					},this));
				} else {
					onAafterCreateDfd.rejectWith(this);
				}
				
			});
			
			// running versioning utility
			onAafterCreateDfd.always(function() {
				this.checkVersion().always(function() {
					_versionDfd.resolveWith(this);
				});
			});
			
			// handle onReady callback and end startup process
			_versionDfd.done(function() {
				$.when(this.config.onReady.call(this)).then($.proxy(function() {
					this._Conn.resolveWith(this);
				},this));
			});
		
		// --- Connection Error ---
		// trhow relative callback and fail deferred object
		} catch (e) {
			this.db = null;
			$.when(this.config.onConnectionError.call(this)).then($.proxy(function() {
				this._Conn.rejectWith(this, e);
			},this));
		}
		
		return this.Conn.promise();
	}
	
	
	
	
	/**
	 * Remove a table and it's contents from database
	 */
	SQLite.prototype.createTable = function(schema, cfg) {
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// setup CREATE statement
		cfg.query = 'CREATE TABLE ' + schema.name + ' (';
		for (var i=0; i<schema.fields.length; i++) {
			cfg.query+= this.columnConfig2Sql(schema.fields[i]);
			if (i < schema.fields.length-1) {
				cfg.query+= ', ';
			}
		}
		cfg.query+= ')';
		
		this.log(cfg.query);
		
		// action
		this.query({
			query: cfg.query
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
	
	
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
		this.findFirst({
			query: "SELECT sql FROM sqlite_master WHERE type='table' AND name = '"+cfg.query+"'"
		
		// success
		}).done(function(r, tx) {
			var fields = __SQLite__fieldsFromSql(r.sql);
			dfd.resolveWith(cfg.context, [fields, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
	
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
	}
	
	
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
		
	}
	
	
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
	}
	
	
	
	
	/**
	 * Remove a table and it's contents from database
	 */
	SQLite.prototype.dropTable = function(cfg) {
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// action
		this.find({
			query: "DROP TABLE " + cfg.query
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
	
	
	
	
	SQLite.prototype.find = function(cfg) {
		if (!this.db) return;
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
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
	
	SQLite.prototype.findFirst = function(cfg) {
		if (!this.db) return;
		
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
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
	 * List al database tables as an array of table names
	 */
	SQLite.prototype.listTables = function(cfg) {
		//this.log('listTables');
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// action
		this.find({
			query: "SELECT * FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'"
		
		// success
		}).done(function(r, tx) {
			var tables = [];
			for (var i=0; i<r.length; i++) {
				tables.push(r[i].name);
			}
			dfd.resolveWith(cfg.context, [tables, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
	
	
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
	
	
	
	
	
	/**
	 * Empty a table
	 */
	SQLite.prototype.truncateTable = function(cfg) {
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		// action
		this.find({
			query: "DELETE FROM " + cfg.query
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, tx, true, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, tx, false, dfd]);
			
		});
		
		return dfd.promise();
	}
	
	



})(jQuery);
