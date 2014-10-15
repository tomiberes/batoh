##Batoh.js

Wrapper for IndexedDB API with NodeJS callback convetions.

Optional Backbone to IndexedDB sync replacement and simple server sync.

###Usage:

```js
setup: {
  database: 'Batoh',
  version: 1,
  stores: {
    trustyPocket: {
      keyPath: things,
      autoIncrement: true,
      indexes: [
        {
          name: 'food',
          keyPath: '',
          unique: true,
          multiEntry: false
        }
      ]
    }
    hiddenPocket: {
      keyPath: null,
      autoIncrement: true,
      indexes: []
    }
  }
}
```

```js
var pocket = new Batoh.Pocket(setup);
```

```js
pocket.[method](store, [params], function(err, result) {
  // shuffle more
});
```

More usage examples can be also found in tests.

###Build:
Only base wrapper is included by default in dist/ directory.
To include extras in the build you need to have `gulp` installed and run command

```
gulp dist --backbone --sync
```

Options:

`--backbone` adds Batoh.backboneSync module.

`--sync` adds Batoh.sync module.

#####`Batoh.backboneSync(method, object, options)`
Can be used to replace Backbone.sync, adds UUID attribute as an ID.
It needs to be done manualy:

```js
Backbone.sync = Batoh.backboneSync;
```

Can only `fetch` a collection.

Model `PATCH` operation is not supported.

#####`Batoh.sync(store, setup, options)`
Simple server synchronization with assumptions.

###API:

#####`Batoh`

Top-level namespace, global object.

#####`Batoh.Pocket(setup)`

Constructor, accepts a setup object.

#####`Pocket.openDB(callback)`

Open or create the database specified in `setup` passed to the constructor.

`callback` gets one argument `(err)`, if there is no error `err` is null.

Example:

```js
pocket.openDB(function() {
  pocket.[method](store, [params], function(err, result) {
    // shuffle more
  });
});
```

#####`Pocket.closeDB()`

Always have to close the database in callback after the last operation in chain.

Example:

```js
pocket.[method](store, [params], function(err, result) {
  pocket.closeDB();
});
```

#####`Pocket.deleteDB(callback)`

Delete the database. Once the operation is successful callback is invoked.

`callback` gets one argument `(err)`, if there is no error `err` is null.

Example:

```js
pocket.deleteDB(function(err, result) {
  // database doesn't exist anymore
});
```

#####`Pocket.add(store, value, [key], callback)`

Add one or more records. If record already exist in object store,
  returns an Error.

`store` String, name of them object store to use.

`value` Object or an Array of objects to store.

`key` String or an Array of strings, as a keys for the values.
  If an Array is passed indexes have to be corresponding to the
  indexes in values Array.

`callback` Function gets two arguments `(err, result)`,
  if there is no Error `err` is `null`. `result` is a single key or
  an Array of keys for the values added.

Example:

```js

```

#####`Pocket.get(store, key, callback)`

Retrieve a record specified by the key.

`store` String, name of the object store to use.

`key` String, key that identifies the record to be retrieved.

`callback` Function gets two arguments `(err, result)`,
  if there is no Error `err` is `null`. `result` is an Object specified,
  by the key or `undefined`.

Example:

```js

```

#####`Pocket.query(store, [query], [each], callback)`

Open a cursor and query the object store.

`store` string, name of the object store to use.

`query` configuration Object defining the query, with following options:

`query.index` index to use, if omitted cursor is opened on the key path of the store.

`query.range` IDBKeyRange Object defining the range.

`query.direction` direction to move the cursor, `next`, `prev`,
  `nextunique`, `preunique`.

`query.limit` Number of records to retrieve.

`each` Function, operation to be called on each cursor value.

`callback` Function, gets two arguments `(err, result)`,
  if there is no Error `err` is `null`. `result` is an Array of records,
  returned b

If `query` and `each` are not passed returns all records from the object store.

Example:

```js

```

For `query` parameter examlpe look on `getLastSync` from sync.js.

For `each` parameter example look on `getDirtyRecords` from sync.js.

#####`Pocket.put(store, value, [key], callback)`

Put one or more records, updating existing or creating a new one.

`store` String, name of them object store to use.

`value` Object or an Array of objects to be stored.

`key` Key or an Array of keys for the values,
  if an Array is passed indexes have to be corresponding to the indexes in values Array.

`callback` Function, gets two arguments `(err, result)`,
  if there is no Error `err` is `null`. `result` is a single key or
  an Array of keys for the values put.

Example:

```js

```

#####`Pocket.delete(store, key, callback)`

Delete record specified by the key.

`store` String, name of the object store to use.

`key` String, key that identifies the record to be deleted.

`callback` Function, gets one argument `(err)`,
  if there is no Error `err` is null.

Example:

```js

```

#####`Pocket.clear(store, callback)`

Delete all records in the object store.

`store` String, name of object store to clear.

`callback` Function, gets one argument `(err)`,
  if there is no error `err` is null.

Example:

```js

```



###TODO:
  more tests

  Batoh.sync conflict resolution and testing

  `examples/`

#####Why the name?
A rucksack.
