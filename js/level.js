define(['pixi','box2d','entities','inputhandler'],
  function(PIXI, Box2D, Entities, InputHandler) {

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

    function CollectableText(globalState, getCoinsCallback) {
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

      self.animate = function (dt) {
        var newValue = self.getCoinsCallback();
        if (self.previousValue != newValue) {
          self.previousValue = newValue;
          self.pixiObject.setText('Coins: ' + newValue + ' / 30');
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
      this.physicsObjects = [];
      this.backgroundLayer = null;
      this.foregroundLayer = null;
      this.foregroundScrollableLayer = null;
      this.hudLayer = null;
      this.collectableText = null;
      this.maxCollectables = 30;
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
      this.collectableText = new CollectableText(globalState, function () { return self.character.collectables; });
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

    var dirtFloorImage = "assets/dirt-floor.png";
    var dirtImage = "assets/dirt.png";
    var collectableImage = "assets/collectable.png";
    module.levels = [];
    module.levels[0] = {
      world: {
        worldWidth: 5000,
        worldHeight: 2000,
      },
      character: {
        x: 100,
        y: 1850
      },
      obstacles: [
        {
          type: Entities.StaticObstacle,
          imagePath: dirtFloorImage,
          width: 384,
          height: 64,
          x: 192,
          y: 2000 - 32
        },
        {
          type: Entities.StaticObstacle,
          imagePath: dirtFloorImage,
          width: 265,
          height: 64,
          x: 520,
          y: 2000 - 64,
          angle: -0.2553419212
        },
        {
          type: Entities.StaticPlatform,
          imagePath: dirtFloorImage,
          width: 506,
          height: 64,
          x: 640,
          y: 2000 - 160,
          angle: 0.2553419212
        },
        {
          type: Entities.StaticObject,
          imagePath: dirtImage,
          width: 512,
          height: 118,
          x: 896,
          y: 2000 - 59
        },
        {
          type: Entities.StaticObstacle,
          imagePath: dirtFloorImage,
          width: 512,
          height: 64,
          x: 896,
          y: 2000 - 96
        },
        {
          type: Entities.StaticObstacle,
          imagePath: dirtFloorImage,
          width: 512,
          height: 64,
          x: 1632,
          y: 2000 - 96
        },
        {
          type: Entities.StaticObstacle,
          imagePath: dirtFloorImage,
          width: 512,
          height: 64,
          x: 2400,
          y: 2000 - 96
        },
      ],
      collectables: [
        {
          x: 192,
          y: 2000 - 300
        }
      ]
    };

    module.GameLevel = function(globalState, level) {
      var self = this;
      Level.call(this, globalState, level.world);

      var character = new Entities.Character(this.world, level.character);
      this.foregroundLayer.addChild(character.sprite);
      this.animatableObjects.push(character);
      this.physicsObjects.push(character);
      this.character = character;
      setInputHandlersForCharacter(globalState.inputHandler, this);

      level.obstacles.forEach(function (opts) {
        var obstacle = new opts.type(self.world, opts);
        self.backgroundLayer.addChild(obstacle.sprite);
      });
      level.collectables.forEach(function (opts) {
        var finalOpts = {
          imagePath: collectableImage,
          width: 32,
          height: 32,
        };
        finalOpts.x = opts.x;
        finalOpts.y = opts.y;
        var collectable = new Entities.Collectable(self.world, finalOpts);
        self.backgroundLayer.addChild(collectable.sprite);
      });
    };

    return module;
  });
