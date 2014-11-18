define(function() {
  function InputHandler() {
    this.keyPressesSinceLastFrame = [];
    this.keyPressHandlers = [];
    for (var i = 0; i < this.KEY_LAST; i++) {
      this.keyPressHandlers.push(function() {});
    }
  }

  InputHandler.KEY_SPACE = 0;
  InputHandler.KEY_LEFT = 1;
  InputHandler.KEY_UP = 2;
  InputHandler.KEY_RIGHT = 3;
  InputHandler.KEY_DOWN = 4;
  InputHandler.KEY_LAST = 5;

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

  InputHandler.prototype.setupInput = function() {
    var self = this;
    function handleKeyCode(keyPressType) {
      return function(e) {
        var event = window.event ? window.event : e;
        var keyType = self.mapKeyCodeToLogicalCode(event.keyCode);
        if (typeof keyType != "undefined") {
          self.keyPressesSinceLastFrame.push([keyType, keyPressType]);
          return false;
        } else {
          return true;
        }
      };
    }
    window.onkeydown = handleKeyCode(true);
    window.onkeyup = handleKeyCode(false);
  };

  InputHandler.prototype.setHandler = function(keyCode, callback) {
    this.keyPressHandlers[keyCode] = callback;
  };

  return InputHandler;
});
