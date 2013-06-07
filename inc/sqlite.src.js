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
	};
	
	
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
	};
	
	
	SQLite.prototype.getTableConfig = function(table) {
		for (var i=0; i<this.config.schema.length; i++) {
			if (this.config.schema[i].name == table) {
				return this.config.schema[i];
			}
		}
	};
	
	
	SQLite.prototype.getTableConfigFields = function(table) {
		var schema = this.getTableConfig(table);
		if (schema) {
			return schema.fields;
		} else {
			return [];
		}
	};
	
	
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
	};
	
	
	/**
	 * Apply default configuration to the instance
	 */
	SQLite.prototype.initialize = function(cfg) {
		
		// single string argument as dbname
		if (typeof cfg == 'string') {
			cfg = {
				name: cfg
			};
		}
		
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
	};
	
	
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
	};
	
	
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
	};
	
	
	
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
	};
	
	
	
	
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
		};
		
		// new version success, chain migrating actions:
		// - callback "onBefore"
		// - execute queries
		// - callbacl "onAfter"
		var _success = function() {
			$.when(version.onBefore.call(this)).then($.proxy(function() {
				this.many(version.query, {quequed:version.quequed}).always($.proxy(function() {
					$.when(version.onAfter.call(this)).then($.proxy(function() {
						dfd.resolveWith(this);	
					}, this));	
				},this));
			},this));
		};
		
		// apply new version and throw callbacks
		if (this.db.version == version.match) {
			this.db.changeVersion(version.match, version.set, null, $.proxy(_error,this), $.proxy(_success,this));
		} else {
			dfd.resolveWith(this);
		}
		
		return dfd.promise();
	};
	
	
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
	};
	
	
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
			
			dfd.resolveWith(cfg.context, [rows, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, false, tx, dfd]);
			
		});
		
		return dfd.promise();
	};
	
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
			
			dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, false, tx, dfd]);
			
		});
		
		return dfd.promise();
	};
	
	
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
					dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
				});
			});
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, false, tx, dfd]);
			
		});
				
		return dfd.promise();
	};
	
	
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
	};
	
	
	/**
	 * each()'s iteration step callback.
	 * just declared as self documentation method!
	 */
	var __SQLite__eachIterator = function(item, i, results) {
		var _D = $.Deferred();
		
		// ... do complex stuff, sub iterations, expensive queries ...
		_D.resolve();
		
		return _D.promise();
	};
	
	
	
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
				dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
			}, function(tx, e) {
				console.log(e);
				dfd.rejectWith(cfg.context, [e, cfg, false, tx, dfd]);
			});
		});
		
		return dfd.promise();
	};
	
	
	/**
	 * Executes a lot of queries toghether and solve a DeferredObject
	 * when all queries have been executed.
	 *
	 * - it doesn't grant execution order
	 * - it doesn't matter if single query success or fails
	 *
	 */
	SQLite.prototype.many = function(queries, cfg) {
		
		// strong type recognising
		if (cfg === true) cfg = {quequed:true};
		
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
			this.manyq(queries, cfg).done(function() {
				dfd.resolveWith(this);
			}).fail(function() {
				dfd.rejectWith(this);
			});
		
		// non quequed multi query implementation
		} else {
			var _queries = 0;
			var _results = {
				done: [],
				fail: []
			};
			
			for (var i=0; i<queries.length; i++) {
				_queries++;
				this.query(queries[i]).done(function() {
					_results.done.push(arguments);
					
				}).fail(function() {
					_results.fail.push(arguments);
				
				// check to determine the ending of queries execution!
				}).always(function() {
					_queries--;
					if (_queries == 0 && i>=queries.length-1) {
						dfd.resolveWith(this, [_results, cfg, true, queries, dfd]);
					}
					
				});
			}
			
			// solve an empty queries array... may be an error of a stupid dev!
			if (!queries.length) {
				dfd.resolveWith(this, [_results, cfg, true, queries, dfd]);
			}
		}
		
		
		
		return dfd.promise();
	};
	
	
	
	/**
	 * Executes a lot of queries toghether and solve a DeferredObject
	 * when all queries have been executed.
	 *
	 * - it grant query given order to be mantained
	 * - it doesn't matter if single query success or fails
	 * 
	 */
	SQLite.prototype.manyq = function(queries, cfg) {
		var cfg = this.configQuery(cfg);
		var dfd = this.configDeferred(cfg);
		
		// missing database connection!
		if (!this.db) {
			dfd.rejectWith(this, [[], queries]);
			return dfd.promise();
		}
		
		var _step	 = 0;
		var _results = {
			done: [],
			fail: []
		};
		
		// step logic
		// go to the next step when query ends execution
		var _doStep = function() {
			var query = queries[_step];
			this.query(query).done(function() {
				_results.done.push(arguments);
				
			}).fail(function() {
				_results.fail.push(arguments);
			
			// determine the end of the queque or setup next step
			}).always(function() {
				if (_step >= queries.length-1) {
					dfd.resolveWith(this, [_results, cfg, true, queries, dfd]);
				} else {
					_step++;
					_doStep.call(this);
				}
			});
			
		};
		
		// startup multiple query execution!
		if (queries.length) {
			_doStep.call(this);
		} else {
			dfd.resolveWith(this, [_results, cfg, true, queries, dfd]);
		}
		
		return dfd.promise();
	};
	
	
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
			dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, false, tx, dfd]);
			
		});
		
		return dfd.promise();
	};
	
	
	
	
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
		this.list({
			query: "DROP TABLE " + cfg.query
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, true, tx, dfd]);
			
		});
		
		return dfd.promise();
	};
	
	
	
	
	
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
		this.query({
			query: "DELETE FROM " + cfg.query
		
		// success
		}).done(function(r, tx) {
			dfd.resolveWith(cfg.context, [r, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, true, tx, dfd]);
			
		});
		
		return dfd.promise();
	};


	
	
	
	
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
		this.list({
			query: "SELECT * FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'"
		
		// success
		}).done(function(r, tx) {
			var tables = [];
			for (var i=0; i<r.length; i++) {
				tables.push(r[i].name);
			}
			dfd.resolveWith(cfg.context, [tables, cfg, true, tx, dfd]);
		
		// failure
		}).fail(function(e, tx) {
			dfd.rejectWith(cfg.context, [e, cfg, true, tx, dfd]);
			
		});
		
		return dfd.promise();
	};	
	
	
	
	window.SQLite = SQLite;
	
	
})(jQuery);
