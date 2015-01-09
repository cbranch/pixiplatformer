define(['pixi','box2d','entities','inputhandler'],
  function(PIXI, Box2D, Entities, InputHandler) {

    var module = {};

    function beginContact(contactPtr) {
      var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
      if (contact.IsTouching()) {
        var objA = contact.GetFixtureA().GetBody().userData;
        var objB = contact.GetFixtureB().GetBody().userData;
        if ('handleCollision' in objA) {
          objA.handleCollision(objB, contact);
        } else {
          objB.handleCollision(objA, contact);
        }
      }
    }

    function endContact(contactPtr) {
      var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
      delete contact.disableThisStep;
      var objA = contact.GetFixtureA().GetBody().userData;
      var objB = contact.GetFixtureB().GetBody().userData;
      if ('handleCollisionEnd' in objA) {
        objA.handleCollisionEnd(objB, contact);
      } else {
        objB.handleCollisionEnd(objA, contact);
      }
    }

    function preSolve(contactPtr, manifold) {
      var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
      var objA = contact.GetFixtureA().GetBody().userData;
      var objB = contact.GetFixtureB().GetBody().userData;
      if ('handleCollisionContinuous' in objA) {
        objA.handleCollisionContinuous(objB, contact);
      } else {
        objB.handleCollisionContinuous(objA, contact);
      }
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

    function Level(globalState, o) {
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
      this.endLevel = false;
      this.onLevelEnded = function () {};
      // setup box2d
      var world = new Box2D.b2World(new Box2D.b2Vec2(0, 9.8));
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
      stage.addChild(this.foregroundScrollableLayer);
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
    };

    return module;
  });
