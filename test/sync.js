suite('Batoh.sync', function() {
  this.timeout(2000);
  var work;
  // Cannot use 'setup' it's user by mocha
  var batohSetup = {
    database: 'BatohSyncTest'
  };

  // setup(function() {
  //   work = new Peon.Work(peonSetup);
  // });

  // teardown(function() {
  //   work.deleteDB();
  // });

  // TODO: sinonjs fake xhr

  test('sync test', function(){
    assert.equal('fail', null);
  });

});
