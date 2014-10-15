/**
 * Batoh.js IndexedDB wrapper
 * Licensed under the MIT license
 * Copyright (c) 2014 Tomas Beres
 *
 * https://github.com/tomiberes/batoh
 */

/* jshint -W097 */
/* global window */
'use strict';

var Batoh = {};

Batoh.IndexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
Batoh.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || { READ_WRITE: 'readwrite' };
Batoh.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
Batoh.IDBCursor = window.IDBCursor = window.IDBCursor || window.webkitIDBCursor || window.mozIDBCursor || window.msIDBCursor;

var CONSTS = {
  READ_ONLY: 'readonly',
  READ_WRITE: 'readwrite',
  VERSION_CHANGE: 'versionchange'
};

/**
 *  Batoh `Pocket` Constructor, creates a setup for specified database
 *  (combination of name and version)
 *  Allows to perform CRUD operations, query, clearing the object store and close DB.
 *
 *  @constructor
 *  @param {Object} setup - Object used for configuration
 */
var Pocket = Batoh.Pocket = function(options) {
  options = options || {};
  // Default values provided, should be changed by passing `options` object
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
    this.setup[key] = typeof options[key] != 'undefined' ? options[key] : this.setup[key];
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
    var dbRequest = Batoh.IndexedDB.open(self.setup.database, self.setup.version);
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
          var index = store.indexes[indexNo];
          objectStore.createIndex(index.name, index.keyPath,
            { unique: index.unique, multiEntry: index.multiEntry });
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
    if (Batoh.IndexedDB.deleteDatabase) {
      var request = Batoh.IndexedDB.deleteDatabase(this.setup.database);
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

    var transaction = this.db.transaction(storeName, CONSTS.READ_WRITE);
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
    var transaction = this.db.transaction(storeName, CONSTS.READ_ONLY);
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
   * @param {Boolean} [query.unique] - TODO?
   * @param {Boolean} [query.multiEntry] - TODO?
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

    var transaction = this.db.transaction(storeName, CONSTS.READ_ONLY);
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

    var transaction = this.db.transaction(storeName, CONSTS.READ_WRITE);

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
    var transaction = this.db.transaction(storeName, CONSTS.READ_WRITE);
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
    var transaction = this.db.transaction(storeName, CONSTS.READ_WRITE);
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
