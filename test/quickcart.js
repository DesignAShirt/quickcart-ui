
  // describe('#purchase()', function(){
  //   it('should error if cart empty (default options.paymentDriver remains)', function(done) {
  //     var cart = new Cart().on('error', function(err) {
  //       assert.strictEqual(err instanceof Error, true);
  //       done();
  //     });
  //     cart.purchase();
  //     assert.strictEqual(cart.locked, false);
  //   });
  //   it('should error if no paymentDriver passed', function(done) {
  //     var cart = new Cart([{}]).on('error', function(err) {
  //       assert.strictEqual(err instanceof Error, true);
  //       done();
  //     });
  //     cart.purchase();
  //     assert.strictEqual(cart.locked, false);
  //   });
  //   it('should lock the cart and items', function() {
  //     var item1 = new Cart.Item()
  //       , item2 = new Cart.Item()
  //       , cart = new Cart([item1, item2], { paymentDriver: successfulPaymentDriver });
  //     cart.purchase();
  //     assert.strictEqual(cart.locked, true);
  //     assert.strictEqual(cart._items[0].locked, true);
  //     assert.strictEqual(cart._items[1].locked, true);
  //   });
  //   it('should not allow purchasing if locked', function() {
  //     var cart = new Cart([{}]);
  //     cart.lock(true);
  //     assert.throws(function() {
  //       cart.purchase();
  //     }, Error);
  //     assert.strictEqual(cart.locked, true); // should not auto unlock
  //   });
  //   it('should accept a callback', function(done) {
  //     var item1 = new Cart.Item()
  //       , item2 = new Cart.Item()
  //       , cart = new Cart([item1, item2], { paymentDriver: successfulPaymentDriver });
  //     cart.purchase(function(err, successful) {
  //       assert.ifError(err);
  //       assert.strictEqual(successful, true);
  //       done();
  //     });
  //   });
  // });
