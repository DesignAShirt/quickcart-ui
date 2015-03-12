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
    , DATA_ATTRIBUTE_PREFIX_ITEM = DATA_ATTRIBUTE_PREFIX + 'item-'
    , DATA_ATTRIBUTE_PREFIX_ITEM_PROPERTY = DATA_ATTRIBUTE_PREFIX_ITEM + 'property-'
    , DEFAULT_TEMPLATES = {}
    , __uid = 0;

  function lazyCompileTemplate(type, source) {
    var compiled = null;
    DEFAULT_TEMPLATES[type] = {
      render: function() {
        compiled = compiled || Hogan.compile(source.join('\n'));
        return compiled.render.apply(compiled, arguments);
      }
    };
  }

  lazyCompileTemplate('item-row', [
    '<tr ' + DATA_ATTRIBUTE_PREFIX_ITEM + 'id="{{id}}">',
      '<td>',
        '{{properties.name}}',
        '<br>',
        '<button ' + DATA_ATTRIBUTE_PREFIX + 'action="remove">Remove</button>',
      '</td>',
      '<td>',
        '{{localizedPrice}}',
      '</td>',
      '<td>',
        '<input type="number" value="{{quantity}}" ' + DATA_ATTRIBUTE_PREFIX + 'action="update" ' + DATA_ATTRIBUTE_PREFIX + 'commit="change" ' + DATA_ATTRIBUTE_PREFIX + 'target="quantity" data-quickcart-propertyvalue="javascript:parseInt(getValue(this), 10)">',
      '</td>',
      '<td>',
        '{{localizedSubtotal}}',
      '</td>',
    '</tr>',
  ]);



  function QuickCartView(doc, options) {
    options = options || {};
    this.doc = doc;
    this.localize = options.localizeAmount;
    this.handlers = options.handlers;
    this.renderer = options.renderer;
    this.objectReferences = {};
  }

  QuickCartView.prototype.getValue = function(element, ignorePropertyValue) {
    if (!ignorePropertyValue && element.getAttribute(DATA_ATTRIBUTE_PREFIX + 'propertyvalue')) {
      var dataValue = element.getAttribute(DATA_ATTRIBUTE_PREFIX + 'propertyvalue')
        , isJsThis = 0 === dataValue.indexOf('this.')
        , isJsProto = 0 === dataValue.indexOf('javascript:');
      if (isJsThis || isJsProto) {
        if (isJsProto) {
          dataValue = dataValue.substr('javascript:'.length);
        }
        return (function(getValue) {
          console.log('datavalue', element, dataValue);
          return eval(dataValue);
        }).call(element, function(element) {
          return QuickCartView.prototype.getValue(element, true);
        });
      }
      else {
        return dataValue;
      }
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
      , itemProperties = {}
      , prefix = allProperties ? DATA_ATTRIBUTE_PREFIX : DATA_ATTRIBUTE_PREFIX_ITEM;

    if (element.hasAttributes()) {
      for (var i=0; i < element.attributes.length; i++) {
        var attr = element.attributes[i]
          , k = attr.name
          , v = attr.value[0] === '$' ? this.getValue(this.doc.querySelector(attr.value.substr(1))) : attr.value;
        if (0 === k.indexOf(DATA_ATTRIBUTE_PREFIX_ITEM_PROPERTY)) {
          itemProperties[k.substr(DATA_ATTRIBUTE_PREFIX_ITEM_PROPERTY.length)] = v;
        }

        if (0 === k.indexOf(prefix)) {
          attrs[k.substr(prefix.length)] = v;
        }
      }
    }

    return {
        id: attrs.id
      , product: attrs.product
      , price: parseInt(attrs.price, 10)
      , quantity: parseInt(attrs.quantity, 10)
      , properties: itemProperties
    };
  };

  QuickCartView.prototype.setProperties = function(element, properties) {
    for (var k in properties) {
      element.setAttribute(DATA_ATTRIBUTE_PREFIX_ITEM + k, properties[k]);
    }
  };

  QuickCartView.prototype.getItem = function(element) {
    console.log('getItem', element);
    if (element) {
      while (!element.getAttribute(DATA_ATTRIBUTE_PREFIX_ITEM + 'id')) {
        element = element.parentNode;
        if (element === this.doc) {
          console.log('getItem found document. aborting.');
          return null;
        }
        console.log('\t-> parent', element);
      }
      return this.objectReferences[element.getAttribute(DATA_ATTRIBUTE_PREFIX_ITEM + 'id')];
    }
    console.log('getItem failed');
    return null;
  };

  QuickCartView.prototype.init = function() {
    var _this = this;
    var handler = function() {
      this.handleEvent = function(event) {
        var cartAction = event.target.getAttribute('data-quickcart-action')
          , cartCommit = event.target.getAttribute('data-quickcart-commit');
        if (cartAction && (!cartCommit || cartCommit.trim().toLowerCase().split(/\s*\,\s*/g).indexOf(event.type) > -1)) {
          var cartTarget = event.target.getAttribute('data-quickcart-target');

          var properties = _this.getItem(event.target) || _this.getProperties(event.target);
          console.log('view:event', event.type, properties, event);

          if (cartTarget) {
            var val = _this.getValue(event.target);
            eval('properties.' + cartTarget + ' = val');
          }
          _this.handlers[cartAction](event.target, properties);
        }
      };
      _this.doc.addEventListener('click', this, false);
      _this.doc.addEventListener('change', this, false);
    };
    new handler();
  };

  QuickCartView.prototype.getContext = function(item) {
    var context = Object.create(item);
    context.localizedSubtotal = this.localize(context.subtotal);
    context.localizedPrice = this.localize(context.price);
    return context;
  };

  QuickCartView.prototype.add = function(item) {
    var listings = this.doc.querySelectorAll('.quickcart-items');
    var rendered = this.renderer('item-row', this.getContext(item));
    this.objectReferences[item.id] = item;
    for (var i=0; i < listings.length; i++) {
      var listing = listings[i];
      listing.innerHTML += rendered;
    }
  };

  QuickCartView.prototype.remove = function(item) {
    var items = this.doc.querySelectorAll('.quickcart-items [' + DATA_ATTRIBUTE_PREFIX_ITEM + 'id="' + item.id + '"]');
    for (var i=0; i < items.length; i++) {
      var element = items[i];
      element.parentNode.removeChild(element);
    }
    delete this.objectReferences[item.id];
  };

  QuickCartView.prototype.update = function(item) {
    var items = this.doc.querySelectorAll('.quickcart-items [' + DATA_ATTRIBUTE_PREFIX_ITEM + 'id="' + item.id + '"]');
    var rendered = this.renderer('item-row', this.getContext(item));
    for (var i=0; i < items.length; i++) {
      var element = items[i];
      element.outerHTML = rendered;
    }
  };

  QuickCartView.prototype.count = function(count) {
    var items = this.doc.querySelectorAll('.quickcart-count');
    for (var i=0; i < items.length; i++) {
      var element = items[i];
      element.innerHTML = count;
    }
  };

  QuickCartView.prototype.quantity = function(quantity) {
    var items = this.doc.querySelectorAll('.quickcart-quantity');
    for (var i=0; i < items.length; i++) {
      var element = items[i];
      element.innerHTML = quantity;
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
    this.renderer = this.options.renderer || function(type, context) {
      return DEFAULT_TEMPLATES[type].render(context);
    };
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
          if (properties.product && properties.price) {
            var cartId = properties.id || QuickCart.generateItemUID();
            properties.id = cartId;
            _this.model.add(properties);
          }
          else {
            console.warn('Product being added from view is incomplete', element, properties);
          }
        },
        remove: function(element, properties) {
          if (properties.id) {
            _this.model.remove(properties.id);
          }
          else {
            console.warn('Product being removed from view is incomplete', element, properties);
          }
        },
        update: function(element, properties) {
          if (properties.id) {
            var item = _this.model.find(properties.id);
            ['product','price','signature','quantity'].forEach(function(element) {
              if (item[element] !== properties[element]) {
                item[element] = properties[element];
              }
            });
            for (var propertyName in properties.properties) {
              item.property(propertyName, properties.properties[propertyName]);
            }
            _this.update(item);
          }
          else {
            console.warn('Product being updated from view is incomplete', element, properties);
          }
        },
        empty: function(element, properties) {
          _this.model.clear();
        },
      },
      renderer: this.renderer
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
      _this.view.count(_this.model.count);
      _this.save();
    });

    this.model.on('quantity', function() {
      _this.view.quantity(_this.model.quantity);
      _this.save();
    });

    this.model.on('total', function() {
      _this.view.total(_this.model.total);
      _this.save();
    });

    var savedState = null;
    if (this.storage) {
      savedState = this.storage.load();
    }
    if (savedState && savedState.items) {
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
      this.storage.save(this.model);
    }
  };

  QuickCart.prototype.purchase = function(callback) {
    var _this = this;
    // TODO: import purchase code from cart model
    throw new Error('Not implemented');
  };

  QuickCart.generateItemUID = function() {
    __uid++;
    return 'quickcartitem' + __uid;
  };

  QuickCart.browserStorage = function(type, scope) {
    scope = scope || window;
    var engine = scope[type + 'Storage']
      , storageKey = 'quickcart';
    if (!engine) {
      throw new Error('Invalid browser storage engine: ' + type);
    }
    return {
      save: function(data) {
        var json = JSON.stringify(data, null, 2);
        console.debug('<- Saving state', json);
        engine.setItem(storageKey, json);
      },
      load: function() {
        var json = engine.getItem(storageKey)
          , parsed = null;
        console.debug('-> Loading state', json);
        if (json) {
          parsed = JSON.parse(json);
          for (var i=0; i < parsed.items.length; i++) {
            if (typeof parsed.items[i].price === 'string') { // expects price handlers to be in the provided scope
              parsed.items[i].price = scope[parsed.items[i].price];
            }
          }
        }
        return parsed;
      }
    };
  };

  return QuickCart;
}));
