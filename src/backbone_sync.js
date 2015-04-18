 /**
 * Backbone.js adapter for Batoh.js
 * Can override Backbone.sync, saves data to IndexedDB instead.
 * Licensed under the MIT license
 * Copyright (c) 2014 Tomas Beres
 *
 * https://github.com/tomiberes/batoh
 */

var backboneSync = Batoh.backboneSync = function(method, object, options) {
  var deferred = jquery.Deferred();
  var data = object.toJSON();
  var db;
  // Collection, or models colleciton have to have attributes of db setup and it's store
  var setup;
  var store;
  var uuid = function() {
    function S4() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
  };
  // Mapping Backbone.sync calls to Batoh IndexedDB calls
  var modelMethodMap = {
    'create': function (cb) {
      db.add(store, data, cb);
    },
    'update': function (cb) {
      db.put(store, data, cb);
    },
    // TODO: reject deferred
    'patch':  function (cb) {
      console.log('PATCH not implemented');
    },
    'delete': function (cb) {
      db.delete(store, data[setup.stores[store].keyPath], cb);
    },
    'read': function (cb) {
      db.get(store, data[setup.stores[store].keyPath], cb);
    }
  };

  // Collection.toJSON() returns an array
  // Only `fetch` of a collection
  if (Array.isArray(data)) {
    setup = object.setup;
    store = object.store;
    db = new Batoh.Database(setup);

    db.open(function(err) {
      if (err) deferred.reject();
      db.query(store, function(err, result) {
        if (err) {
          options.error(err);
          deferred.reject();
          db.close();
          return;
        } else {
          options.success(result);
          deferred.resolve();
          db.close();
          return;
        }
      });
    });
  // Model methods
  } else {
    setup = object.collection.setup;
    store = object.collection.store;
    db = new Batoh.Database(setup);
    // UUID to act as server ID for Backbone model replacing cID after sync
    if (!data.id) data.id = uuid();

    db.open(function(err) {
      if (err) deferred.reject();
      modelMethodMap[method](function (err, result) {
        if (err) {
          options.error(err);
          deferred.reject();
          db.close();
          return;
        } else {
          // If it the operation wasn't `read`, have to
          // update timestamp of in memory model, setting Model.isNew() to false
          if (method !== 'read') {
            modelMethodMap.read(function(err, result) {
              options.success(result[0]);
              deferred.resolve();
              db.close();
              return;
            });
          } else {
            options.success(result[0]);
            deferred.resolve();
            db.close();
            return;
          }
        }
      });
    });
  }
  return deferred.promise();

};
