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

    function setInputHandlersForCharacter(inputHandler, levelState) {
      inputHandler.setHandler(InputHandler.KEY_SPACE, function(down) {
        if (levelState.character) {
          levelState.character.handleJumpInput(down);
        }
      });
      inputHandler.setHandler(InputHandler.KEY_LEFT, function(down) {
        if (levelState.character) {
          levelState.character.moveLeft(down);
        }
      });
      inputHandler.setHandler(InputHandler.KEY_RIGHT, function(down) {
        if (levelState.character) {
          levelState.character.moveRight(down);
        }
      });
      inputHandler.setHandler(InputHandler.KEY_UP, function(down) {});
      inputHandler.setHandler(InputHandler.KEY_DOWN, function(down) {
        if (levelState.character) {
          levelState.character.moveDown(down);
        }
      });
    }

    function defineWorldEdge(world, x1, y1, x2, y2) {
      var bodyDef = new Box2D.b2BodyDef();
      bodyDef.set_position(new Box2D.b2Vec2((x2 - x1) / 2, (y2 - y1) / 2));
      var body = world.CreateBody(bodyDef);
      body.userData = new Entities.WorldEdge();
      var worldEdgeDef = new Box2D.b2EdgeShape();
      worldEdgeDef.Set(new Box2D.b2Vec2(x1, y1), new Box2D.b2Vec2(x2, y2));
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
      this.animatableObjectsToRemove = [];
      this.physicsObjects = [];
      this.backgroundLayer = null;
      this.foregroundLayer = null;
      this.foregroundScrollableLayer = null;
      this.hudLayer = null;
      this.collectableText = null;
      this.maxCollectables = o.maxCollectables;
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
    Level.prototype.removeAnimatableObject = function (o) {
      this.animatableObjectsToRemove.push(o);
    };
    Level.prototype.purgeRemovedAnimatableObjects = function () {
      var self = this;
      this.animatableObjectsToRemove.forEach(function (o) {
        var i = self.animatableObjects.indexOf(o);
        if (i != -1) {
          self.animatableObjects.splice(i, 1);
        }
      });
    };

    module.levels = LevelData;

    module.GameLevel = function(globalState, level, onLoaded) {
      var self = this;
      var setupLevel = function () {
        var character = new Entities.Character(self.world, level.character, level.world.maxCollectables);
        self.foregroundLayer.addChild(character.sprite);
        self.animatableObjects.push(character);
        self.physicsObjects.push(character);
        self.character = character;
        setInputHandlersForCharacter(globalState.inputHandler, self);
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
          texture: "assets/princess1.png",
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
