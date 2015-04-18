(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Batoh = factory();
  }
}(this, function() {
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

var IndexedDB = Batoh.IndexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
var IDBTransaction = Batoh.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || { READ_WRITE: 'readwrite' };
var IDBKeyRange = Batoh.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
var IDBCursor = Batoh.IDBCursor = window.IDBCursor = window.IDBCursor || window.webkitIDBCursor || window.mozIDBCursor || window.msIDBCursor;

var MODE = Batoh.MODE = {
  READ_ONLY: 'readonly',
  READ_WRITE: 'readwrite',
  VERSION_CHANGE: 'versionchange'
};

var isFunction = Batoh.isFunction = function(obj) {
  return typeof obj === 'function' || false;
};

/**
 *  Batoh `Database`/`Pocket` Constructor, creates a setup for specified database
 *  (combination of name and version)
 *  Allows to perform CRUD operations, query, clearing the object store and close DB.
 *
 *  @constructor
 *  @param {Object} setup - Object used for configuration
 */
var Database = Batoh.Pocket = Batoh.Database = function(options) {
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
  this.idb = null;
};

Database.prototype = {

  /**
   * Open or create the database using the `setup` passed to the constructor.
   *
   * @param {Function} callback - gets one argument `(err)`,
   *  if there is no error `err` is null.
   */
  open: function(cb) {
    var self = this;
    var request;
    try {
      request = IndexedDB.open(self.setup.database, self.setup.version);
    } catch (err) {
      if (isFunction(cb)) return cb(err);
    }
    request.onsuccess = function(event) {
      self.idb = event.target.result;
      if (isFunction(cb)) return cb(null);
    };
    request.onerror = function(event) {
      if (isFunction(cb)) return cb(event.target.error);
    };
    request.onblocked = function(event) {
      if (isFunction(cb)) return cb(event.target.error);
    };
    request.onupgradeneeded = function(event) {
      try {
        var idb = event.target.result;
        for (var storeName in self.setup.stores) {
          var store = self.setup.stores[storeName];
          var objectStore = idb.createObjectStore(storeName,
            { keyPath: store.keyPath, autoIncrement: store.autoIncrement });
          for (var indexNo in store.indexes) {
            var index = store.indexes[indexNo];
            objectStore.createIndex(index.name, index.keyPath,
              { unique: index.unique, multiEntry: index.multiEntry });
          }
        }
      } catch (err) {
        if (isFunction(cb)) return cb(err);
      }
    };
  },

  /**
   * Always have to close the database in cb,
   *  after the last operation in chain.
   */
  close: function() {
    if (this.idb) {
      this.idb.close();
      this.idb = null;
    }
  },

  /**
   * If deleting database is provided by implementation,
   * delete the database used with current setup.
   *
   * @param {Function} callback - gets one argument `(err)`,
   *  if there is no error `err` is null.
   *
   * TODO: correct success, blocked, versionchange handling,
   * current spec is unclear and outcome is not usable,
   * thus using only the `onsuccess` handler.
   */
  destroy: function(cb) {
    if (IndexedDB.deleteDatabase) {
      var request = IndexedDB.deleteDatabase(this.setup.database);
      // It's always in an order of onblocked -> onsuccess,
      // ignoring other handlers, for now.
      request.onsuccess = function(event) {
        if (isFunction(cb)) return cb(null, event.target.result);
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
   * Wrap IDBDatabase.transaction
   *
   * @param {String} storeNames - names of the object stores to use.
   * @param {String} mode - transaction mode to use.
   * @param {Function} callback - gets two arguments `(err, result)`,
   *  if there is no Error `err` is `null`.
   * @param {Object} result - Object that will be returned as a result of
   *  the transaction.
   */
  transaction: function(storeNames, mode, result, cb) {
    var transaction;
    try {
      transaction = this.idb.transaction(storeNames, mode);
    } catch (err) {
      if (isFunction(cb)) return cb(err);
    }
    transaction.onabort = function(event) {
      if (isFunction(cb)) return cb(event.target.error);
    };
    transaction.onerror = function(event) {
      if (isFunction(cb)) return cb(event.target.error);
    };
    transaction.oncomplete = function(event) {
      if (isFunction(cb)) return cb(null, result);
    };
    return transaction;
  },

  /**
   * Wrap IDBTransation.objectStore
   *
   * @param {String} storeName - name of the object store to use.
   * @param {IDBTransaction} transaction - to use.
   * @param {Function} callback - gets one argument `(err)`,
   *  if there is no error, it won't be called.
   */
  store: function(storeName, transaction, cb) {
    try {
      return transaction.objectStore(storeName);
    } catch (err) {
      if (isFunction(cb)) return cb(err);
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
   *  if there is no Error `err` is `null`. `result` is always an Array of keys
   *  for the values added.
   */
  add: function(storeName, value, key, cb) {
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
      cb = key;
      key = null;
    }
    if (!Array.isArray(value)) {
      data.value = [value];
    } else {
      data.value = value;
    }

    var result = [];
    var transaction = this.transaction(storeName, MODE.READ_WRITE, result, cb);
    var store = this.store(storeName, transaction, cb);
    var _add = function(value, key) {
      var request;
      try {
        request = store.add(value, key);
      } catch (err) {
        if (isFunction(cb)) return cb(err);
      }
      request.onsuccess = function(event) {
        result.push(event.target.result);
      };
      request.onerror = function(event) {
        if (isFunction(cb)) return cb(event.target.error);
      };
    };
    for (var i = 0, l = data.value.length; i < l ; i++) {
      // In-line key
      if (!data.key) {
        _add(data.value[i]);
      // Out-of-line key
      } else {
        _add(data.value[i], data.key[i]);
      }
    }
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
   *  if there is no Error `err` is `null`. `result` is always an Array of keys
   *  of the values put.
   */
  put: function(storeName, value, key, cb) {
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
      cb = key;
      key = null;
    }
    if (!Array.isArray(value)) {
      data.value = [value];
    } else {
      data.value = value;
    }

    var result = [];
    var transaction = this.transaction(storeName, MODE.READ_WRITE, result, cb);
    var store = this.store(storeName, transaction, cb);
    var _put = function(value, key) {
      var request;
      try {
        request = store.put(value, key);
      } catch (err) {
        if (isFunction(cb)) return cb(err);
      }
      request.onsuccess = function(event) {
        result.push(event.target.result);
      };
      request.onerror = function(event) {
        if (isFunction(cb)) return cb(event.target.error);
      };
    };
    for (var i = 0, l = data.value.length; i < l; i++) {
      // In-line key
      if (!data.key) {
        _put(data.value[i]);
      // Out-of-line key
      } else {
        _put(data.value[i], data.key[i]);
      }
    }
  },

  /**
   * Retrieve one or more records specified by the key.
   *
   * @param {String} storeName - name of the object store to use
   * @param {String} key - key that identifies the record to be retrieved
   * @param {Function} callback - gets two arguments `(err, result)`,
   *  if there is no Error `err` is `null`. `result` is always an Array
   *  of the retrieved objects.
   */
  get: function(storeName, key, cb) {
    if (!Array.isArray(key)) {
      key = [key];
    }

    var result = [];
    var transaction = this.transaction(storeName, MODE.READ_ONLY, result, cb);
    var store = this.store(storeName, transaction, cb);
    var _get = function(key) {
      var request;
      try {
        request = store.get(key);
      } catch (err) {
        if (isFunction(cb))return cb(err);
      }
      request.onsuccess = function(event) {
        result.push(event.target.result);
      };
      request.onerror = function(event) {
        if (isFunction(cb)) return cb(event.target.error);
      };
    };
    for (var i = 0, l = key.length; i < l; i++) {
      _get(key[i]);
    }
  },

  /**
   * Delete one or more records specified by the key.
   *
   * @param {String} storeName - name of the object store to use
   * @param {String} key - key that identifies the record to be deleted.
   * @param {Function} callback - gets two arguments `(err, result)`,
   *  if there is no Error `err` is `null`. `result` is always an Array of the
   *  results of delete operations (undefined).
   */
  delete: function(storeName, key, cb) {
    if (!Array.isArray(key)) {
      key = [key];
    }

    var result = [];
    var transaction = this.transaction(storeName, MODE.READ_WRITE, result, cb);
    var store = this.store(storeName, transaction, cb);
    var _del = function(key) {
      var request;
      try {
        request = store.delete(key);
      } catch (err) {
        if (isFunction(cb)) return cb(err);
      }
      request.onsuccess = function(event) {
        result.push(event.target.result);
      };
      request.onerror = function(event) {
        if (isFunction(cb)) return cb(event.target.error);
      };
    };
    for (var i = 0, l = key.length; i < l; i++) {
      _del(key[i]);
    }
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
  query: function(storeName, query, each, cb) {
    if (arguments.length === 3) {
      cb = each;
      each = null;
    }
    if (arguments.length === 2) {
      cb = query;
      query = null;
      each = null;
    }

    var result = [];
    var transaction = this.transaction(storeName, MODE.READ_ONLY, result, cb);
    var store = this.store(storeName, transaction, cb);
    var target = store;
    var request;
    try {
      // Change the target of the cursor, if defined
      if (query !== null && query.index) {
        target = store.index(query.index);
      }
      // Set a limit, if defined
      if (query !== null && query.limit) {
        var limit = query.limit;
      }
      if (query === null) {
        // Retrieve all records from object store
        request = target.openCursor();
      } else {
        request = target.openCursor(query.range, query.direction);
      }
    } catch(err) {
      if (isFunction(cb)) return cb(err);
    }
    request.onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        // Execute specified operation on each value
        if (isFunction(each)) {
          result.push(each(cursor.value));
        // Gather all results according to query
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
        try {
          cursor.continue();
        } catch (err) {
          if (isFunction(cb)) return cb(err);
        }
      } else {
        // No more matching records
      }
    };
    request.onerror = function(event) {
      if (isFunction(cb)) return cb(event.target.error);
    };
  },

  /**
   * Count the objects in the store.
   *
   * @param {String} storeName - name of the object store to count.
   * @param {Function} callback - gets one argument `(err)`,
   *  if there is no error `err` is null.
   */
  count: function(storeName, cb) {
    var result;
    var transaction = this.transaction(storeName, MODE.READ_ONLY, result, cb);
    var store = this.store(storeName, transaction, cb);
    var request;
    try {
      request = store.count();
    } catch (err) {
      if (isFunction(cb)) return cb(err);
    }
    request.onsuccess = function(event) {
      result = event.target.result;
    };
    request.onerror = function(event) {
      if (isFunction(cb)) return cb(event.target.error);
    };
  },

  /**
   * Clear the object store of all records.
   *
   * @param {String} storeName - name of the object store to clear
   * @param {Function} callback - gets one argument `(err)`,
   *  if there is no error `err` is null.
   */
  clear: function(storeName, cb) {
    var result;
    var transaction = this.transaction(storeName, MODE.READ_WRITE, result, cb);
    var store = this.store(storeName, transaction, cb);
    var request;
    try {
      request = store.clear();
    } catch (err) {
      if (isFunction(cb)) return cb(err);
    }
    request.onsuccess = function(event) {
      result = event.target.result;
    };
    request.onerror = function(event) {
      if (isFunction(cb)) return cb(event.target.error);
    };
  },

};

return Batoh;
}));
