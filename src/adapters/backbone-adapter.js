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
