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
	
});