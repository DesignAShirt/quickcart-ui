// Uses AMD or browser globals to create a module.

// Grabbed from https://github.com/umdjs/umd/blob/master/amdWeb.js.
// Check out https://github.com/umdjs/umd for more patterns.

// Defines a module "cart".
// Note that the name of the module is implied by the file name. It is best
// if the file name and the exported global have matching names.

// If you do not want to support the browser global path, then you
// can remove the `root` use and the passing `this` as the first arg to
// the top function.

(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(['quickcart'], function (quickcart) {
      return factory(quickcart);
    });
  }
  else if (typeof module !== 'undefined' && module.exports && require) {
    module.exports = factory(require('../node_modules/quickcart/quickcart.js'));
  }
  else {
    root.QuickCart = factory(root.Cart);
  }
}(this, function (Cart) {
  'use strict';

  var DATA_ATTRIBUTE_PREFIX = 'data-quickcart-'
    , DATA_ATTRIBUTE_PREFIX_ITEM = 'item-'
    , __uid = 0;

  function QuickCartView(doc, options) {
    options = options || {};
    this.doc = doc;
    this.localize = options.localizeAmount;
    this.handlers = options.handlers;
  }

  QuickCartView.prototype.getValue = function(element) {
    if (element.getAttribute(DATA_ATTRIBUTE_PREFIX + 'propertyvalue')) {
      return element.getAttribute(DATA_ATTRIBUTE_PREFIX + 'propertyvalue');
    }
    else if ('value' in element) {
      return element.value
    }
    else if ('selectedIndex' in element) {
      return element.options[element.selectedIndex].value;
    }
    else {
      return element.innerHTML;
    }
  };

  QuickCartView.prototype.getProperties = function(element, allProperties) {
    var attrs = {}
      , prefix = DATA_ATTRIBUTE_PREFIX;
    if (!allProperties) {
      prefix += DATA_ATTRIBUTE_PREFIX_ITEM;
    }
    if (element.hasAttributes()) {
      for (var i=0; i < element.attributes.length; i++) {
        var attr = element.attributes[i]
          , k = attr.name
          , v = attr.value;
        if (0 === k.indexOf(prefix)) {
          attrs[k.substr(prefix.length)] = v[0] === '$' ? this.getValue(this.doc.querySelector(v.substr(1))) : v;
        }
      }
    }
    return {
        id: attrs.id
      , product: attrs.product
      , price: parseInt(attrs.price, 10)
      , quantity: parseInt(attrs.quantity, 10)
      , properties: {} // TODO: implement properties
    };
  };

  QuickCartView.prototype.setProperties = function(element, properties) {
    for (var k in properties) {
      element.setAttribute(DATA_ATTRIBUTE_PREFIX_ITEM + k, properties[k]);
    }
  };

  QuickCartView.prototype.init = function() {
    var _this = this;
    var handler = function() {
      this.handleEvent = function(event) {
        var cartAction = event.target.getAttribute('data-quickcart-action');
        if (cartAction) {
          var properties = _this.getProperties(event.target);
          console.log('view:event', event.type, properties, event);
          // switch (event.type) {
          //   case 'click':
          //     _this.handlers(_this._createItemFromElement(event.target));
          //   break;
          //   case 'change':
              _this.handlers[cartAction](event.target, properties);
          //   break;
          // }
        }
      };
      _this.doc.addEventListener('click', this, false);
      _this.doc.addEventListener('change', this, false);
    };
    new handler();
  };

  QuickCartView.prototype.add = function(item) {
    var listings = this.doc.querySelectorAll('.quickcart-items');
    for (var i=0; i < listings.length; i++) {
      var listing = listings[i];
      var div = this.doc.createElement('div');
      this.setProperties(div, {
          id: item.id
        , product: item.product
        , price: item.price
        , quantity: item.quantity
      });
      listing.appendChild(div);
    }
    this.update(item);
  };

  QuickCartView.prototype.remove = function(item) {
    var items = this.doc.querySelectorAll('.quickcart-items [' + DATA_ATTRIBUTE_PREFIX_ITEM + 'id="' + item.id + '"]');
    for (var i=0; i < items.length; i++) {
      var element = items[i];
      element.parentNode.removeChild(element);
    }
  };

  QuickCartView.prototype.update = function(item) {
    var items = this.doc.querySelectorAll('.quickcart-items [' + DATA_ATTRIBUTE_PREFIX_ITEM + 'id="' + item.id + '"]');
    for (var i=0; i < items.length; i++) {
      var element = items[i];
      element.innerHTML = item.product + ' - ' + this.localize(item.price) + '<br><input type="text" value="' + item.quantity + '" data-quickcart-action="update" data-quickcart-item-id="' + item.id + '"> <button data-quickcart-action="remove" data-quickcart-item-id="' + item.id + '">&times;</button>'; // TODO: render with hogan
    }
  };

  QuickCartView.prototype.count = function(count) {
    var items = this.doc.querySelectorAll('.quickcart-count');
    for (var i=0; i < items.length; i++) {
      var element = items[i];
      element.innerHTML = count;
    }
  };

  QuickCartView.prototype.total = function(total) {
    var items = this.doc.querySelectorAll('.quickcart-total');
    for (var i=0; i < items.length; i++) {
      var element = items[i];
      element.innerHTML = this.localize(total);
    }
  };







  var _uid = 0;
  function QuickCart(doc, options) {
    options = options || {};
    options.model = options.cart || {};
    var _this = this;
    this.options = options;
    this.doc = doc;
    this.view = null;
    this.model = new Cart(options.model);
    this.storage = options.storage || null;

    // TODO: implement something that polls storage for changes and syncs so that multiple tabs work as expected
  }

  QuickCart.prototype.add = function(product, quantity) {
    if (typeof product === 'string') {
      product = {
          product: product
        , quantity: quantity || 1
      };
    }
    product.id = QuickCart.generateItemUID();
    this.model.add(product);
    return product.id;
  };

  QuickCart.prototype.update = function(cartId, properties) {
    var item = this.model.find(cartId);
    for (var k in properties) {
      item[k] = properties[k];
    }
  };

  QuickCart.prototype.init = function() {
    this._initView();
    this._initModel();
  };

  QuickCart.prototype._initView = function() {
    var _this = this;
    this.view = new QuickCartView(this.doc, {
      localizeAmount: function(amt) {
        return '$' + (amt / 100).toFixed(2);
      },
      handlers: {
        add: function(element, properties) {
          var cartId = properties.id || QuickCart.generateItemUID();
          properties.id = cartId;
          _this.model.add(properties);
          _this.view.setProperties(element, { id: cartId });
        },
        remove: function(element, properties) {
          _this.model.remove(properties.id);
        },
        update: function(element, properties) {
          _this.update(properties.id, {
              quantity: properties.quantity
            , price: properties.price
          });
        },
        clear: function(element, properties) {
          _this.model.clear();
        },
      }
    });
    this.view.init();
    this.view.count(0);
    this.view.total(0);
  };

  QuickCart.prototype._initModel = function() {
    var _this = this;

    this.model.on('item:add', function(item) {
      _this.view.add(item);
    });

    this.model.on('item:remove', function(item) {
      _this.view.remove(item);
    });

    this.model.on('item:change', function(item) {
      _this.view.update(item);
    });

    this.model.on('count', function() {
      console.log('Cart event -> count');
      _this.view.count(_this.model.count);
    });

    this.model.on('total', function() {
      console.log('Cart event -> total');
      _this.view.total(_this.model.total);
      _this.save();
    });

    var savedState = null;
    if (this.storage) {
      savedState = JSON.parse(this.storage.getItem('quickcart'));
      console.debug('Loading state', savedState);
    }
    if (savedState.items) {
      savedState.items.forEach(function(item) {
        item.id = QuickCart.generateItemUID();
      });
      this.model.add(savedState.items);
    }
  };

  QuickCart.prototype.empty = function() {
    this.model.clear();
  };

  QuickCart.prototype.save = function() {
    if (this.storage) {
      var json = JSON.stringify(this.model);
      console.debug('Saving state', json);
      this.storage.setItem('quickcart', json);
    }
  };

  QuickCart.prototype.purchase = function(callback) {
    var _this = this;
    this.model.once('purchase', function(successful) {
      console.log('Cart event -> purchase');
      if (successful) {
        _this.model.clear();
        callback(null, true);
      }
      else {
        console.warn('Purchase was not successful; Cancelled by the user');
        callback(null, false);
      }
    });

    this.model.purchase();
  };

  QuickCart.generateItemUID = function() {
    __uid++;
    return 'quickcartitem' + __uid;
  };

  return QuickCart;
}));
