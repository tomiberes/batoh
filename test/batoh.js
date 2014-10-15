suite('Batoh', function() {
  this.timeout(2000);
  // Cannot use `setup` it's used by mocha
  var batohSetup = {
    database: 'BatohCoreTest',
    version: 1,
    stores: {
      autoStore: {
        keyPath: null,
        autoIncrement: true,
        indexes: [
          {
            name: 'number',
            keyPath: 'number',
            unique: true,
            multiEntry: false
          }
        ]
      },
      pathStore: {
        keyPath: 'keyLock',
        autoIncrement: false,
        indexes: [
          {
            name: 'number',
            keyPath: 'number'
          }
        ]
      },
      keyStore: {
        keyPath: null,
        autoIncrement: false,
        indexes: []
      }
    }
  };
  var pocket = new Batoh.Pocket(batohSetup);

  // Cannot have empty (unused) before/after methods, it will missbehave
  // beforeEach in BDD
  // setup(function() {
  // });

  // afterEach in BDD
  // teardown(function(done) {
  // });

  // Undocumented mocha functions, see TDD interface
  // setup and teardown 'this' suite, not nested ones

  // before in BDD ("before all" hook)
  // suiteSetup(function() {
  //   pocket = new Batoh.Pocket(batohSetup);
  // });

  // after in BDD ("after all" hook)
  suiteTeardown(function(done) {
    pocket.deleteDB(function(err, result) {
      if (err) throw err;
      done();
    });
  });

  suite('object store with autoIncrement', function() {
    var store = 'autoStore';
    var first = {
      hidden: 'dissapointment',
      number: 1
    };
    var more = [
      {
        hidden: 'adventure',
        number: 2
      },
      {
        hidden: 'desire',
        number: 3
      },
      {
        hidden: 'evil',
        number: 4
      },
      {
        hidden: 'surprise',
        number: 5
      },
      {
        hidden: 'story',
        number: 6
      }
    ];
    var mutated = { expectations: 'chaged' };
    var spawns = [
      { lille: 'mutants' },
      { many: 'mutations' }
    ];

    test('add one, get it by id and compare', function(done) {
      pocket.openDB(function(err) {
        if (err) throw err;
        pocket.add(store, first, function(err, result) {
          if (err) throw err;
          pocket.get(store, result, function(err, result) {
            if (err) throw err;
            pocket.closeDB();
            assert.equal(result.hidden, first.hidden, 'same object was returned');
            done();
          });
        });
      });
    });

    test('add bulk records, get them by ids and compare', function(done) {
      assert.ok(false, 'not implemented');
      done();
    });

    test('put modified, query by id with `each` filter', function(done) {
      assert.ok(false, 'not implemented');
      done();
    });

    test('delete one by id and ensure it\'s not stored', function(done) {
      assert.ok(false, 'not implemented');
      done();
    });

    test('clear and ensure store is empty, querying all', function(done) {
      assert.ok(false, 'not implemented');
      done();
    });

  });

  suite('object store with keyPath', function() {
    var store = 'pathStore';
    var gate = { keyLock: 'every gate have one' };
    var gates = [
      { keyLock: 'some are hidden' },
      { keyLock: 'some you can find easily' },
      { keyLock: 'might be fake' },
      { keyLock: 'and some lead to labyrinth' }
    ];
    var fake = {
      keyLock: 'every gate have one',
      and: 'noone knew where\'s this one'
    };
    var different = [
      {
        keyLock: 'some are hidden',
        name: 'hapiness'
      },
      {
        keyLock: 'some you can find easily',
        name: 'sadness'
      }
    ];
    var other = [
      {
        keyLock: 'lost',
        number: 3
      },
      {
        keyLock: 'fund',
        number: 5
      },
      {
        keyLock: 'broken',
        number: 9
      }
    ];
    var poor = {
      keyLock: "never noticed"
    };

    test('add one', function(done) {
      pocket.openDB(function(err) {
        if (err) throw err;
        pocket.add(store, gate, function(err, result) {
          if (err) throw err;
          pocket.get(store, result, function(err, result) {
            if (err) throw err;
            pocket.closeDB();
            assert.equal(gate.keyLock, result.keyLock, 'same object was returned');
            done();
          });
        });
      });
    });

    test('pupdate it', function(done) {
      pocket.openDB(function(err) {
        if (err) throw err;
        pocket.put(store, fake, function(err, result) {
          if (err) throw err;
          pocket.get(store, result, function(err, result) {
            if (err) throw err;
            pocket.closeDB();
            assert.equal(fake.and, result.and, 'same again');
            done();
          });
        });
      });
    });

    test('add more', function(done) {
      pocket.openDB(function(err) {
        if (err) throw err;
        pocket.add(store, gates, function(err, result) {
          if (err) throw err;
          pocket.get(store, gates[0].keyLock, function(err, result) {
            if (err) throw err;
            pocket.closeDB();
            assert.equal(gates[0].keyLock, result.keyLock, 'it is one of the gates');
            done();
          });
        });
      });
    });

    test('update more', function(done) {
      pocket.openDB(function(err) {
        if (err) throw err;
        pocket.put(store, different, function(err, result) {
          if (err) throw err;
          pocket.get(store, gates[0].keyLock, function(err, result) {
            if (err) throw err;
            pocket.closeDB();
            assert.equal(different[0].name, result.name, 'more of the changed');
            done();
          });
        });
      });
    });

    test('query some other', function(done) {
      var query = {
        index: 'number',
        range: IDBKeyRange.lowerBound(5),
        direction: 'next',
        limit: 2
      };
      pocket.openDB(function(err) {
        if (err) throw err;
        pocket.put(store, other, function(err, result) {
          if (err) throw err;
          pocket.query(store, query, function(err, result) {
            if (err) throw err;
            pocket.closeDB();
            assert.lengthOf(result, 2, 'limit the number of results');
            assert.equal(result[0].keyLock, other[1].keyLock, 'first result has number of lowerBound');
            assert.equal(result[1].keyLock, other[2].keyLock, 'direction is \'next\'');
            done();
          });
        });
      });
    });

    test('delete one', function(done) {
      pocket.openDB(function(err) {
        if (err) throw err;
        pocket.add(store, poor, function(err, result) {
          if (err) throw err;
          pocket.get(store, poor.keyLock, function(err, result) {
            if (err) throw err;
            assert.equal(poor.keyLock, result.keyLock, 'inserted and retrieved');
            pocket.delete(store, poor.keyLock, function(err, result) {
              if (err) throw err;
              pocket.get(store, poor.keyLock, function(err, result) {
                pocket.closeDB();
                assert.isUndefined(result, 'gone forever');
                done();
              });
            });
          });
        });
      });
    });

    test('clear rest', function(done) {
      pocket.openDB(function(err) {
        if (err) throw err;
        pocket.clear(store, function(err, result) {
          if (err) throw err;
          pocket.query(store, function(err, result) {
            if (err) throw err;
            pocket.closeDB();
            assert.lengthOf(result, 0, 'store is empty');
            done();
          });
        });
      });
    });

  });

  suite('object store with out-of-line keys', function() {
    var musketeers = {
      one: {
        number: 1,
        name: 'athos'
      },
      two: {
        number: 2,
        name: 'portos'
      },
      three: {
        number: 3,
        name: 'aramis'
      },
      four: {
        number: 4,
        name: 'dartagnan'
      }
    };

    test('add first', function(done) {
      assert.ok(false, 'not implemented');
      done();
    });

    // TODO: more

  });

});
