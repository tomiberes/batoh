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

  // Collection.toJSON() returns an array
  // Only `fetch` of a collection
  if (data instanceof Array) {
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
    if (!data.id) {
      var S4 = function () {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      };
      data.id = (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    }

    // Mapping Backbone.sync calls to Batoh IndexedDB calls
    var methodMap = {
      'create': function (callback) {
        db.add(store, data, callback);
      },
      'update': function (callback) {
        db.put(store, data, callback);
      },
      // TODO: reject deferred
      'patch':  function (callback) {
        console.log('PATCH not implemented');
      },
      'delete': function (callback) {
        db.delete(store, data[setup.stores[store].keyPath], callback);
      },
      'read': function (callback) {
        db.get(store, data[setup.stores[store].keyPath], callback);
      }
    };

    db.open(function(err) {
      if (err) deferred.reject();
      methodMap[method](function (err, result) {
        if (err) {
          options.error(err);
          deferred.reject();
          db.close();
          return;
        } else {
          // If it the operation wasn't `read`, have to
          // update timestamp of in memory model, setting Model.isNew() to false
          if (method !== 'read') {
            methodMap.read(function(err, result) {
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
