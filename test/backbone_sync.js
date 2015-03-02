suite('Batoh.backboneSync', function() {
  this.timeout(2000);
  Backbone.sync = Batoh.backboneSync;
  var db;
  // Cannot use `setup` it's used by mocha
  var batohSetup = {
    database: 'BatohBackboneTest',
    version: 1,
    stores: {
      pivo: {
        keyPath: 'brand',
        autoIncrement: false,
        indexes: []
      },
      vino: {
        keyPath: 'path',
        autoIncrement: false,
        indexes: []
      }
    }
  };

  var Beer = Backbone.Model.extend({
    collection: Basket,

    defaults: {
      brand: '',
      quality: ''
    }

  });

  var Basket = Backbone.Collection.extend({
    model: Beer,

    initialize: function(models, options) {
      this.setup = options.setup;
    },

    url: '/pivo',

    store: 'pivo',

  });

  var pivo = new Beer({ brand: 'jednicka' , quality: 'dobra' });
  var pevo = new Beer({ brand: 'dvojka' , quality: 'ujde' });
  var moral = new Beer({ brand: 'trojka' , quality: 'vytecna' });

  var options = {};
  options.setup = batohSetup;
  var reges = new Basket([pivo, pevo, moral], options);

  // setup(function() {
  // });

  // teardown(function() {
  // });

  suiteSetup(function() {
    db = new Batoh.Database(batohSetup);
  });

  suiteTeardown(function(done) {
    db.destroy(function(err, result) {
      if (err) throw err;
      done();
    });
  });

  suite('Backbone.Model.sync', function() {
    test('one', function(done) {
      pivo.save(null, {
        success: function(model, response, options) {
          assert.isFalse(model.isNew(), 'first isn\'t new anymore');
          pevo.save(null, {
            success: function(model, response, options) {
              assert.isFalse(model.isNew(), 'second isn\'t new anymore');
              var quality = { quality: 'over quantity' };
              pivo.save(quality, {
                success: function(model, response, options) {
                  assert.isFalse(model.isNew(), 'changed and isn\'t new anymore');
                  assert.equal(quality.quality, model.attributes.quality, 'attribute updated');
                  reges.fetch({
                    success: function(data) {
                      assert.isFalse(data.models[0].isNew(), 'model is fetched from DB');
                      assert.isFalse(data.models[1].isNew(), 'model is fetched from DB');
                      done();
                    }
                  });
                }
              });
            }
          });
        }
      });
    });

    test('two', function(done){
      assert.ok(false, 'not implemented');
      done();
    });

    test('three', function(done){
      assert.ok(false, 'not implemented');
      done();
    });

    test('four', function(done){
      assert.ok(false, 'not implemented');
      done();
    });

    test('five', function(done){
      assert.ok(false, 'not implemented');
      done();
    });

  });

  // TODO: find out how does collection sync works, which methods are available
  suite('Backbone.Collection.fetch', function() {
    test('Collection from indexedDB', function(done){
      assert.ok(false, 'not implemented');
      done();
    });

  });

});
