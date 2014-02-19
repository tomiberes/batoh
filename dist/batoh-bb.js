/**
 * Batoh.js IndexedDB wrapper
 * Licensed under the MIT license
 * Copyright (c) 2014 Tomas Beres
 *
 * https://github.com/tomiberes/batoh
 */
(function() {
  'use strict';

  var Batoh = window.Batoh = {};

  var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB ;
  var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || { READ_WRITE: 'readwrite' };
  var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange ;

  window.IDBCursor = window.IDBCursor || window.webkitIDBCursor ||  window.mozIDBCursor ||  window.msIDBCursor;

  /**
   *  Batoh `Pocket` Constructor, creates a setup for specified database
   *  (combination of name and version)
   *  Allows to perform CRUD operations, query, clearing the object store and close DB.
   *
   *  @constructor
   *  @param {Object} setup - Object used for configuration
   */
  var Pocket = Batoh.Pocket = function(kwArgs) {
    // Default values provided, should be changed by passing `kwArgs` object
    this.setup = {
      database: 'Batoh',
      version: 1,
      stores: {
        store: {
          keyPath: null,
          autoIncrement: true,
          indexes: []
        }
      }
    };
    for (var key in this.setup) {
      this.setup[key] = typeof kwArgs[key] != 'undefined' ? kwArgs[key] : this.setup[key];
    }
    this.db = null;
  };

  Pocket.prototype = {

    /**
     * Open or create the database using the `setup` passed to the constructor.
     *
     * @param {Function} callback - gets one argument `(err)`,
     *  if there is no error `err` is null.
     */
    openDB: function(callback) {
      var self = this;
      var dbRequest = indexedDB.open(self.setup.database, self.setup.version);
      dbRequest.onsuccess = function(event) {
        self.db = event.target.result;
        if (callback && typeof(callback) === 'function') {
          callback(null);
        }
      };
      dbRequest.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          callback(event.target.error);
        }
      };
      dbRequest.onblocked = function(event) {
        if (callback && typeof(callback) === 'function') {
          callback(event.target.error);
        }
      };
      dbRequest.onupgradeneeded = function(event) {
        self.db = event.target.result;
        for (var storeName in self.setup.stores) {
          var store = self.setup.stores[storeName];
          var objectStore = self.db.createObjectStore(storeName,
            { keyPath: store.keyPath, autoIncrement: store.autoIncrement });
          for (var indexNo in store.indexes) {
            // TODO: more index options, `unique`, `multientry`
            objectStore.createIndex(store.indexes[indexNo].name,
              store.indexes[indexNo].keyPath);
          }
        }
      };
    },

    /**
     * Always have to close the database in callback,
     *  after the last operation in chain.
     */
    closeDB: function() {
      if (this.db) {
        this.db.close();
      }
    },

    /**
     * If deleting database is provided by implementation,
     * delete the database used with current `pocket` setup.
     *
     * @param {Function} callback - gets one argument `(err)`,
     *  if there is no error `err` is null.
     *
     * TODO: correct success, blocked, versionchange handling,
     * current spec is unclear and outcome is not usable,
     * thus using only the `onsuccess` handler.
     */
    deleteDB: function(callback) {
      if (indexedDB.deleteDatabase) {
        var request = indexedDB.deleteDatabase(this.setup.database);
        // It's always in an order of onblocked -> onsuccess,
        // ignoring other handlers, for now.
        request.onsuccess = function(event) {
          if (callback && typeof(callback) === 'function') {
            return callback(null, event.target.result);
          }
        };
        request.onerror = function(event) {
        };
        request.onblocked = function(event) {
        };
        request.onversionchange = function(event) {
        };
      }
    },

    /**
     * Add one or more records. If record already exist in object store,
     *  returns an Error.
     *
     * @param {String} storeName - name of the object store to use.
     * @param {Object|Object[]} value - Object or Array of objects to store.
     * @param {String|String[]} [key] - String or an Array of strings,
     *  as a keys for the values.
     *  If an Array is passed indexes have to be corresponding to the
     *  indexes in values Array.
     * @param {Function} callback - gets two arguments `(err, result)`,
     *  if there is no Error `err` is `null`. `result` is a single key or
     *  an Array of keys for the values added.
     */
    add: function(storeName, value, key, callback) {
      // For usage of out-of-line keys a `key` argument have to be specified,
      // otherwise the `request` will be made assuming in-line key or key generator.
      // For detailed possibilities see what you can't do in `DataError` section here:
      // `https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore.add#Exceptions`
      var data = {};
      if (arguments.length === 4) {
        if (!Array.isArray(key)) {
          data.key = [key];
        } else {
          data.key = key;
        }
      }
      if (arguments.length === 3) {
        callback = key;
        key = null;
      }
      if (!Array.isArray(value)) {
        data.value = [value];
      } else {
        data.value = value;
      }

      var result = [];

      var transaction = this.db.transaction(storeName, 'readwrite');
      transaction.onabort = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.oncomplete = function(event) {
        if (callback && typeof(callback) === 'function') {
          result = result.length === 1 ? result[0] : result;
          return callback(null, result);
        }
      };

      var store = transaction.objectStore(storeName);
      var add = function(value, key) {
        var request = store.add(value, key);
        request.onsuccess = function(event) {
          result.push(event.target.result);
        };
        request.onerror = function(event) {
          if (callback && typeof(callback) === 'function') {
            return callback(event.target.error);
          }
        };
      };
      for (var i = 0; i < data.value.length; i++) {
        // In-line key
        if (!data.key) {
          add(data.value[i]);
        // Out-of-line key
        } else {
          add(data.value[i], data.key[i]);
        }
      }
    },

    /**
     * Retrieve a record specified by the key.
     *
     * @param {String} storeName - name of the object store to use
     * @param {String} key - key that identifies the record to be retrieved
     * @param {Function} callback - gets two arguments `(err, result)`,
     *  if there is no Error `err` is `null`. `result` is an Object specified,
     *  by the key or `undefined`.
     */
    get: function(storeName, key, callback) {
      var transaction = this.db.transaction(storeName, 'readonly');
      transaction.onabort = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.oncomplete = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(null, result);
        }
      };

      var store = transaction.objectStore(storeName);
      var request = store.get(key);
      var result = null;
      request.onsuccess = function(event) {
        result = event.target.result;
      };
      request.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
    },

    /**
     * Open cursor and query the object store.
     *
     * @param {string} storeName - name of the object store to use
     * @param {Object} query - configuration Object defining the query
     * @param {String} [query.index] - index to use, if omitted cursor is
     *  opened on the keyPath of the store
     * @param {Object} [query.range] - IDBKeyRange object defining the range
     * @param {String} [query.direction] - direction to move the cursor,
     *  `next`, `prev`, `nextunique`, `prevunique`
     * @param {Number} [query.limit] - number of records to retrieve
     * @param {Boolean} [query.unique] - TODO
     * @param {Boolean} [query.multiEntry] - TODO
     * @param {Function} [each] - operation to be called on each cursor value
     * @param {Function} callback - gets two arguments `(err, result)`,
     *  if there is no Error `err` is `null`. `result` is an Array of records,
     *  returned by the query.
     */
    query: function(storeName, query, each, callback) {
      if (arguments.length === 3) {
        callback = each;
        each = null;
      }
      if (arguments.length === 2) {
        callback = query;
        query = null;
        each = null;
      }

      var result = [];

      var transaction = this.db.transaction(storeName, 'readonly');
      transaction.onabort = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.oncomplete = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(null, result);
        }
      };

      var store = transaction.objectStore(storeName);
      var target = store;
      // Change the target of the cursor, if defined
      if (query !== null && query.index) {
        target = store.index(query.index);
      }
      // Set a limit, if defined
      if (query !== null && query.limit) {
        var limit = query.limit;
      }
      var request;
      if (query === null) {
        // Retrieve all records from object store
        request = target.openCursor();
      } else {
        request = target.openCursor(query.range, query.direction);
      }
      request.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          // Execute specified operation on each value
          if (each) {
            each(cursor.value);
          } else {
            result.push(cursor.value);
          }
          // Limit the number of results
          if (limit) {
            limit--;
            if (limit === 0) {
              return;
            }
          }
          cursor.continue();
        } else {
          // No more matching records
        }
      };
      request.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
    },

    /**
     * Put one or more records, updating existing or creating a new one.
     *
     * @param {String} storeName - name of the object store to use.
     * @param {Object|Object[]} value - Object or Array of values to store.
     * @param {String|String[]} [key] - Key or an Array of keys for the values,
     *  if an Array is passed indexes have to be corresponding to the
     *  indexes in values Array.
     * @param {Function} callback - gets two arguments `(err, result)`,
     *  if there is no Error `err` is `null`. `result` is a single key or
     *  an Array of keys for the values put.
     */
    put: function(storeName, value, key, callback) {
      // For usage of out-of-line keys a `key` argument have to be specified,
      // otherwise the `request` will be made assuming in-line key or key generator.
      // For detailed possibilities see what you can't do in DataError section here:
      // `https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore.put#Exceptions`
      var data = {};
      if (arguments.length === 4) {
        if (!Array.isArray(key)) {
          data.key = [key];
        } else {
          data.key = key;
        }
      }
      if (arguments.length === 3) {
        callback = key;
        key = null;
      }
      if (!Array.isArray(value)) {
        data.value = [value];
      } else {
        data.value = value;
      }

      var result = [];

      var transaction = this.db.transaction(storeName, 'readwrite');

      transaction.onabort = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.oncomplete = function(event) {
        // If result is a single element Array convert it back to an Object
        result = result.length === 1 ? result[0] : result;
        if (callback && typeof(callback) === 'function') {
          return callback(null, result);
        }
      };

      var store = transaction.objectStore(storeName);

      var put = function(value, key) {
        var request = store.put(value, key);
        request.onsuccess = function(event) {
          result.push(event.target.result);
        };
        request.onerror = function(event) {
          if (callback && typeof(callback) === 'function') {
            return callback(event.target.error);
          }
        };
      };
      for (var i = 0; i < data.value.length; i++) {
        // In-line key
        if (!data.key) {
          put(data.value[i]);
        // Out-of-line key
        } else {
          put(data.value[i], data.key[i]);
        }
      }
    },

    /**
     * Delete record specified by the key.
     *
     * @param {String} storeName - name of the object store to use
     * @param {String} key - key that identifies the record to be deleted.
     * @param {Function} callback - gets one argument `(err)`,
     *  if there is no Error `err` is null.
     */
    delete: function(storeName, key, callback) {
      var transaction = this.db.transaction(storeName, 'readwrite');
      transaction.onabort = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.oncomplete = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(null);
        }
      };

      var store = transaction.objectStore(storeName);
      var request = store.delete(key);
      request.onsuccess = function(event) {
        // There is no result
      };
      request.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
    },

    /**
     * Clear the object store of all records.
     *
     * @param {String} storeName - name of the object store to clear
     * @param {Function} callback - gets one argument `(err)`,
     *  if there is no error `err` is null.
     */
    clear: function(storeName, callback) {
      var transaction = this.db.transaction(storeName, 'readwrite');
      transaction.onabort = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
      transaction.oncomplete = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(null);
        }
      };

      var store = transaction.objectStore(storeName);
      var request = store.clear();
      request.onsuccess = function(event) {
        // There is no result
      };
      request.onerror = function(event) {
        if (callback && typeof(callback) === 'function') {
          return callback(event.target.error);
        }
      };
    }

  };

})();

 /**
 * Backbone.js adapter for Batoh.js
 * Overrides Backbone.sync, saves data to IndexedDB instead.
 * Licensed under the MIT license
 * Copyright (c) 2014 Tomas Beres
 *
 * https://github.com/tomiberes/batoh
 */
 /* jshint sub:true */
(function() {
  'use strict';

  var Batoh = window.Batoh;
  var $ = window.$;
  var Backbone = window.Backbone;

  Batoh.backboneSync = function(method, object, options) {
    var deferred = $.Deferred();
    var data = object.toJSON();
    var pocket;
    // Collection, or models colleciton have to have attributes of database setup and it's store
    var setup;
    var store;

    // Collection.toJSON() returns an array
    // Only `fetch` of a collection
    if (data instanceof Array) {
      setup = object.setup;
      store = object.store;
      pocket = new Batoh.Pocket(setup);

      pocket.openDB(function(err) {
        if (err) deferred.reject();
        pocket.query(store, function(err, result) {
          if (err) {
            options.error(err);
            deferred.reject();
            pocket.closeDB();
            return;
          } else {
            options.success(result);
            deferred.resolve();
            pocket.closeDB();
            return;
          }
        });
      });

    // Model methods
    } else {
      setup = object.collection.setup;
      store = object.collection.store;
      pocket = new Batoh.Pocket(setup);

      // UUID to act as server ID for Backbone model replacing cID after sync
      if (!data.id) {
        var S4 = function () {
          return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        data.id = (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
      }

      // Mapping Backbone.sync calls to Batoh IndexedDB calls
      var methodMap = {
        'create': function (callback) {
          pocket.add(store, data, callback);
        },
        'update': function (callback) {
          pocket.put(store, data, callback);
        },
        // TODO: reject deferred
        'patch':  function (callback) {
          console.log('PATCH not implemented');
        },
        'delete': function (callback) {
          pocket.delete(store, data[setup.stores[store].keyPath], callback);
        },
        'read': function (callback) {
          pocket.get(store, data[setup.stores[store].keyPath], callback);
        }
      };

      pocket.openDB(function(err) {
        if (err) deferred.reject();
        methodMap[method](function (err, result) {
          if (err) {
            options.error(err);
            deferred.reject();
            pocket.closeDB();
            return;
          } else {
            // If it the operation wasn't `read`, have to
            // update timestamp of in memory model, setting Model.isNew() to false
            if (method !== 'read') {
              methodMap['read'](function(err, result) {
                options.success(result);
                deferred.resolve();
                pocket.closeDB();
                return;
              });
            } else {
              options.success(result);
              deferred.resolve();
              pocket.closeDB();
              return;
            }
          }
        });
      });

    }
    return deferred.promise();

  };
  Backbone.sync = Batoh.backboneSync;

})();
