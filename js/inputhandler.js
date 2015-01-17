define(function() {
  var defaultKeyPressHandler = function() {};
  function InputHandler() {
    this.keyPressesSinceLastFrame = [];
    this.keyPressHandlers = [];
    this.synchronousHandling = [];
    for (var i = 0; i < this.KEY_LAST; i++) {
      this.keyPressHandlers.push(defaultKeyPressHandler);
    }
  }

  InputHandler.KEY_SPACE = 0;
  InputHandler.KEY_LEFT = 1;
  InputHandler.KEY_UP = 2;
  InputHandler.KEY_RIGHT = 3;
  InputHandler.KEY_DOWN = 4;
  InputHandler.KEY_P = 5;
  InputHandler.KEY_Q = 6;
  InputHandler.KEY_LAST = 7;

  InputHandler.prototype.mapKeyCodeToLogicalCode = function(code) {
    switch (code) {
      case 32:
        return InputHandler.KEY_SPACE;
      case 37:
        return InputHandler.KEY_LEFT;
      case 38:
        return InputHandler.KEY_UP;
      case 39:
        return InputHandler.KEY_RIGHT;
      case 40:
        return InputHandler.KEY_DOWN;
      case 80:
        return InputHandler.KEY_P;
      case 81:
        return InputHandler.KEY_Q;
      default:
        return undefined;
    }
  };

  InputHandler.prototype.processInput = function() {
    var keyPresses = this.keyPressesSinceLastFrame;
    this.keyPressesSinceLastFrame = [];
    var handlers = this.keyPressHandlers;
    keyPresses.forEach(function(keyPress) {
      handlers[keyPress[0]](keyPress[1]);
    });
  };

  InputHandler.prototype.processInputSelectively = function(keys) {
    var keyPresses = this.keyPressesSinceLastFrame;
    this.keyPressesSinceLastFrame = [];
    var handlers = this.keyPressHandlers;
    keyPresses.forEach(function(keyPress) {
      if (keys.indexOf(keyPress[0]) != -1) {
        handlers[keyPress[0]](keyPress[1]);
      }
    });
  };

  InputHandler.prototype.setupInput = function() {
    var self = this;
    function handleKeyCode(keyPressType) {
      return function(e) {
        var event = window.event ? window.event : e;
        var keyType = self.mapKeyCodeToLogicalCode(event.keyCode);
        if (typeof keyType != "undefined") {
          if (self.synchronousHandling.indexOf(keyType) != -1) {
            self.keyPressHandlers[keyType](keyPressType);
          } else {
            self.keyPressesSinceLastFrame.push([keyType, keyPressType]);
          }
          return false;
        } else {
          return true;
        }
      };
    }
    window.onkeydown = handleKeyCode(true);
    window.onkeyup = handleKeyCode(false);
  };

  InputHandler.prototype.setHandler = function(keyCode, callback, isSynchronous) {
    this.keyPressHandlers[keyCode] = callback;
    if (isSynchronous) {
      this.synchronousHandling.push(keyCode);
    }
  };

  InputHandler.prototype.removeHandler = function(keyCode) {
    this.keyPressHandlers[keyCode] = defaultKeyPressHandler;
    var i = this.synchronousHandling.indexOf(keyCode);
    if (i != -1) {
      this.synchronousHandling.splice(i);
    }
  };

  return InputHandler;
});
