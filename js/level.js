define(['underscore','pixi','box2d','entities','inputhandler','levelobstacles','leveldata'],
  function(_, PIXI, Box2D, Entities, InputHandler, LevelObstacles, LevelData) {

    var module = {};

    function beginContact(contactPtr) {
      var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
      if (contact.IsTouching()) {
        var objA = contact.GetFixtureA().GetBody().userData;
        var objB = contact.GetFixtureB().GetBody().userData;
        Entities.handleCollision(objA, objB, contact);
      }
    }

    function endContact(contactPtr) {
      var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
      delete contact.disableThisStep;
      var objA = contact.GetFixtureA().GetBody().userData;
      var objB = contact.GetFixtureB().GetBody().userData;
      Entities.handleCollisionEnd(objA, objB, contact);
    }

    function preSolve(contactPtr, manifold) {
      var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
      var objA = contact.GetFixtureA().GetBody().userData;
      var objB = contact.GetFixtureB().GetBody().userData;
      Entities.handleCollisionContinuous(objA, objB, contact);
      if (contact.disableThisStep) {
        contact.SetEnabled(false);
      }
    }

    function createContactListener() {
      var contactListener = new Box2D.JSContactListener();
      contactListener.BeginContact = beginContact;
      contactListener.EndContact = endContact;
      contactListener.PreSolve  = preSolve;
      contactListener.PostSolve = function (contactPtr, impulsePtr) {};
      return contactListener;
    }

    function defineWorldEdge(world, x1, y1, x2, y2) {
      var xWidth = x2 - x1;
      var yWidth = y2 - y1;
      var xMid = xWidth / 2 + x1;
      var yMid = yWidth / 2 + y1;
      var bodyDef = new Box2D.b2BodyDef();
      bodyDef.set_position(new Box2D.b2Vec2(xMid, yMid));
      var body = world.CreateBody(bodyDef);
      body.userData = new Entities.WorldEdge();
      var worldEdgeDef = new Box2D.b2EdgeShape();
      worldEdgeDef.Set(new Box2D.b2Vec2(xWidth * -0.5, yWidth * -0.5),
                       new Box2D.b2Vec2(xWidth * 0.5, yWidth * 0.5));
      body.CreateFixture(worldEdgeDef, 1.0);
    }

    function createEdgesForWorld(levelState) {
      var world = levelState.world;
      var width = levelState.worldWidth / 100;
      var height = levelState.worldHeight / 100;
      defineWorldEdge(world, 0, -10, 0, height + 10);
      defineWorldEdge(world, width, -10, width, height + 10);
    }

    function CollectableText(globalState, maxCollectables, getCoinsCallback) {
      var self = this;
      self.pixiObject = new PIXI.Text('Coins: 0 / 30', {
        font: '24px Helvetica Neue, Arial, sans-serif',
        fill: 'white'
      });
      self.pixiObject.anchor = new PIXI.Point(0.5, 0);
      self.pixiObject.x = globalState.screenWidth / 2;
      self.pixiObject.y = globalState.screenHeight - 36;
      self.getCoinsCallback = getCoinsCallback;
      self.previousValue = 0;
      self.maxCollectables = maxCollectables;

      self.animate = function (dt) {
        var newValue = self.getCoinsCallback();
        if (self.previousValue != newValue) {
          self.previousValue = newValue;
          self.pixiObject.setText('Coins: ' + newValue + ' / ' + maxCollectables);
        }
      };
    }

    function easeInCubic(time, startValue, changeInValue, duration) {
        time = time / duration;
        return changeInValue * time * time * time + startValue;
    }

    function easeOutCubic(time, startValue, changeInValue, duration) {
        time = (time / duration) - 1;
        return changeInValue * (time * time * time + 1) + startValue;
    }

    function FadeTransition(level, fromAlpha, toAlpha, duration, onFinish) {
      var self = this;
      // Screen fade out
      self.pixiObject = new PIXI.DisplayObjectContainer();
      var fadeObject = new PIXI.Graphics();
      fadeObject.beginFill(0);
      fadeObject.drawRect(0, 0, level.globalState.screenWidth, level.globalState.screenHeight);
      fadeObject.endFill();
      self.pixiObject.addChild(fadeObject);
      self.pixiObject.alpha = fromAlpha;
      level.hudLayer.addChild(self.pixiObject);
      level.addAnimatableObject(self);
      var deltaAlpha = toAlpha - fromAlpha;

      self.animate = function (dt, currentTime) {
        if (!('fromTime' in self)) {
          self.fromTime = currentTime;
        }
        var elapsedTime = Math.min((currentTime - self.fromTime) / 1000, duration);
        var currentPosition = (elapsedTime / duration) * deltaAlpha + fromAlpha;
        self.pixiObject.alpha = currentPosition;
        if (elapsedTime >= duration) {
          level.removeAnimatableObject(self);
          if (onFinish) {
            onFinish();
          }
        }
      };
    }

    function LevelText(level, text, duration, onFinishIn, onFinishOut) {
      var self = this;
      var textInX = -level.globalState.screenWidth / 2;
      var textMidX = level.globalState.screenWidth / 2;
      var textOutX = level.globalState.screenWidth + textMidX;
      self.pixiObject = new PIXI.Text(text, {
        font: '48px Helvetica Neue, Arial, sans-serif',
        fill: 'white',
        align: 'center',
        dropShadow: true
      });
      self.pixiObject.anchor = new PIXI.Point(0.5, 0.5);
      self.pixiObject.x = textInX;
      self.pixiObject.y = level.globalState.screenHeight / 2;
      level.hudLayer.addChild(self.pixiObject);
      level.addAnimatableObject(self);

      var animateInFunction = function (dt, currentTime) {
        if (!('fromTime' in self)) {
          self.fromTime = currentTime;
        }
        var elapsedTime = (currentTime - self.fromTime) / 1000;
        self.pixiObject.x = easeOutCubic(Math.min(elapsedTime, duration),
          textInX, textMidX - textInX, duration);
        if (elapsedTime > duration) {
          level.removeAnimatableObject(self);
          if (onFinishIn) {
            onFinishIn();
          }
        }
      };
      var animateOutFunction = function (dt, currentTime) {
        if (!('fromTime' in self)) {
          self.fromTime = currentTime;
        }
        var elapsedTime = (currentTime - self.fromTime) / 1000;
        self.pixiObject.x = easeInCubic(Math.min(elapsedTime, duration),
          textMidX, textOutX - textMidX, duration);
        if (elapsedTime > duration) {
          level.removeAnimatableObject(self);
          if (onFinishOut) {
            onFinishOut();
          }
        }
      };

      self.animate = animateInFunction;
      self.animateOut = function () {
        level.addAnimatableObject(self);
        self.animate = animateOutFunction;
        delete self.fromTime;
      };
    }

    function LevelCompleteScreen(level) {
      var self = this;
      new FadeTransition(level, 0, 0.7, 0.5);
      new LevelText(level, level.levelCompletionText, 2.0, function () {
        level.globalState.inputHandler.setHandler(InputHandler.KEY_SPACE, function (down) {
          if (down) {
            new FadeTransition(level, 0, 1.0, 0.5, function () {
              level.endLevel = true;
              level.onLevelEnded = function() {
                level.globalState.loadLevel(LevelData[level.nextLevel]);
              };
            });
          }
        });
        var pressSpaceText = new PIXI.Text("Press space to continue", {
          font: '24px Helvetica Neue, Arial, sans-serif',
          fill: 'white',
          align: 'center',
          dropShadow: true
        });
        pressSpaceText.anchor = new PIXI.Point(0.5, 0.5);
        pressSpaceText.x = level.globalState.screenWidth / 2;
        pressSpaceText.y = level.globalState.screenHeight * 0.8;
        level.hudLayer.addChild(pressSpaceText);
      });
    }

    function Level(globalState, o) {
      var self = this;
      this.globalState = globalState;
      this.paused = false;
      this.pauseLayer = null;
      this.stage = null;
      this.worldWidth = o.worldWidth;
      this.worldHeight = o.worldHeight;
      this.character = null;
      this.animatableObjects = [];
      this.animatableObjectsQueue = [];
      this.physicsObjects = [];
      this.backgroundLayer = null;
      this.foregroundLayer = null;
      this.foregroundScrollableLayer = null;
      this.hudLayer = null;
      this.collectableText = null;
      this.maxCollectables = o.maxCollectables;
      this.isLevelComplete = false;
      this.endLevel = false;
      this.onLevelEnded = function () {};
      // setup box2d
      var world = new Box2D.b2World(new Box2D.b2Vec2(0, 18.0));
      this.world = world;
      world.SetContactListener(createContactListener());
      world.SetDebugDraw(globalState.debugDraw);
      createEdgesForWorld(this);
      // create an new instance of a pixi stage
      var stage = new PIXI.Stage(globalState.backgroundColor);
      this.stage = stage;
      this.backgroundLayer = new PIXI.DisplayObjectContainer();
      this.foregroundLayer = new PIXI.DisplayObjectContainer();
      this.foregroundScrollableLayer = new PIXI.DisplayObjectContainer();
      this.foregroundScrollableLayer.addChild(this.backgroundLayer);
      this.foregroundScrollableLayer.addChild(this.foregroundLayer);
      this.foregroundScrollableLayer.addChild(globalState.debugGraphics);
      // BEGIN HUD
      this.hudLayer = new PIXI.DisplayObjectContainer();
      this.hudBackground = new PIXI.Graphics();
      this.hudBackground.beginFill(0x000022, 1.0);
      this.hudBackground.drawRect(0, globalState.screenHeight - 48, globalState.screenWidth, 48);
      this.hudBackground.endFill();
      this.hudLayer.addChild(this.hudBackground);
      this.collectableText = new CollectableText(globalState,
        this.maxCollectables,
        function () { return self.character.collectables; });
      this.animatableObjects.push(this.collectableText);
      this.hudLayer.addChild(this.collectableText.pixiObject);
      // END HUD
      stage.addChild(this.foregroundScrollableLayer);
      stage.addChild(this.hudLayer);
      var pauseText = new PIXI.Text("PAUSED", {
        font: 'bold 48px Helvetica Neue, Arial, sans-serif',
        fill: 'white',
        stroke: 'black',
        strokeThickness: 6
      });
      pauseText.anchor = new PIXI.Point(0.5, 0.5);
      pauseText.x = 500;
      pauseText.y = 300;
      this.pauseLayer = new PIXI.DisplayObjectContainer();
      this.pauseLayer.addChild(pauseText);
      this.pauseLayer.visible = false;
      stage.addChild(this.pauseLayer);
    }
    Level.prototype.addAnimatableObject = function (o) {
      this.animatableObjectsQueue.push({ add: true, object: o });
    };
    Level.prototype.removeAnimatableObject = function (o) {
      this.animatableObjectsQueue.push({ add: false, object: o });
    };
    Level.prototype.updateAnimatableObjectList = function () {
      var self = this;
      this.animatableObjectsQueue.forEach(function (o) {
        var i = self.animatableObjects.indexOf(o.object);
        if (i != -1) {
          if (!o.add) {
            self.animatableObjects.splice(i, 1);
          }
        } else {
          if (o.add) {
            self.animatableObjects.push(o.object);
          }
        }
      });
    };
    Level.prototype.levelComplete = function () {
      if (!this.isLevelComplete) {
        this.isLevelComplete = true;
        var levelCompleteScreen = new LevelCompleteScreen(this);
        this.unbindInputHandlersForCharacter(this.globalState.inputHandler);
      }
    };
    Level.prototype.setInputHandlersForCharacter = function (inputHandler) {
      var self = this;
      inputHandler.setHandler(InputHandler.KEY_SPACE, function(down) {
        if (self.character) {
          self.character.handleJumpInput(down);
        }
      });
      inputHandler.setHandler(InputHandler.KEY_LEFT, function(down) {
        if (self.character) {
          self.character.moveLeft(down);
        }
      });
      inputHandler.setHandler(InputHandler.KEY_RIGHT, function(down) {
        if (self.character) {
          self.character.moveRight(down);
        }
      });
      inputHandler.setHandler(InputHandler.KEY_UP, function(down) {});
      inputHandler.setHandler(InputHandler.KEY_DOWN, function(down) {
        if (self.character) {
          self.character.moveDown(down);
        }
      });
    };
    Level.prototype.unbindInputHandlersForCharacter = function (inputHandler) {
      inputHandler.removeHandler(InputHandler.KEY_SPACE);
      inputHandler.removeHandler(InputHandler.KEY_LEFT);
      inputHandler.removeHandler(InputHandler.KEY_RIGHT);
      inputHandler.removeHandler(InputHandler.KEY_UP);
      inputHandler.removeHandler(InputHandler.KEY_DOWN);
    };


    module.levels = LevelData;

    module.GameLevel = function(globalState, level, onLoaded) {
      var self = this;
      var setupLevel = function () {
        self.nextLevel = level.world.nextLevel;
        var character = new Entities.Character(self.world, level.character, level.world.maxCollectables);
        self.foregroundLayer.addChild(character.sprite);
        self.animatableObjects.push(character);
        self.physicsObjects.push(character);
        self.character = character;
        self.setInputHandlersForCharacter(globalState.inputHandler);
        self.levelCompletionText = level.world.completionText;
        // DEBUG CODE
        globalState.inputHandler.setHandler(InputHandler.KEY_Q, function(down) {
          self.levelComplete();
        });
        // Setup map
        level.obstacles.forEach(function (opts) {
          var combinedOpts = _.extend(opts, LevelObstacles[opts.type]);
          var obstacle = new combinedOpts.jsType(self.world, combinedOpts);
          self.backgroundLayer.addChild(obstacle.sprite);
        });
        // Add collectables
        var collectableOpts = {
          texture: "assets/collectable.png",
          width: 32,
          height: 32,
          anchor: { x: 0.5, y: 0.5 }
        };
        level.collectables.forEach(function (opts) {
          _.extend(opts, collectableOpts);
          var collectable = new Entities.Collectable(self.world, opts);
          self.backgroundLayer.addChild(collectable.sprite);
          self.animatableObjects.push(collectable);
        });
        // Place princess
        var princessOpts = _.extend({
          texture: "assets/princess.png",
          lockTexture: "assets/lock.png",
          width: 64,
          height: 128,
          anchor: { x: 0.5, y: 1 }
        }, level.princess);
        var princess = new Entities.Princess(self.world, princessOpts);
        self.backgroundLayer.addChild(princess.sprite);
        princess.lockSprites.forEach(function (sprites) {
          sprites.forEach(function (x) {
            self.foregroundLayer.addChild(x);
          });
        });
        self.animatableObjects.push(princess);
        var fadeIn = new FadeTransition(self, 1.0, 0.0, 0.3, function () {
          self.hudLayer.removeChild(fadeIn.pixiObject);
          var introText = new LevelText(self, level.world.introductionText, 2.0, function () {
            introText.animateOut();
          }, function () {
            self.hudLayer.removeChild(introText.pixiObject);
          });
        });
        onLoaded();
      };

      Level.call(this, globalState, level.world);
      var loader = new PIXI.AssetLoader(level.assetsToLoad);
      loader.onComplete = setupLevel;
      loader.load();
    };
    module.GameLevel.prototype = Object.create (Level.prototype);
    module.GameLevel.prototype.constructor = module.GameLevel;

    return module;
  });
