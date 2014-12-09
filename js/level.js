define(['pixi','box2d','entities','inputhandler'],
  function(PIXI, Box2D, Entities, InputHandler) {

    var module = {};

    function postSolve(contactPtr, impulsePtr) {
      var contact = Box2D.wrapPointer(contactPtr, Box2D.b2Contact);
      var impulse = Box2D.wrapPointer(impulsePtr, Box2D.b2ContactImpulse);
      var nImpulses = impulse.get_count();
      var impulses = [];
      for (var i = 0; i < nImpulses; i++) {
        impulses.push(Box2D.getValue(impulsePtr + i * 4, "float"));
      }
      var objA = contact.GetFixtureA().GetBody().userData;
      var objB = contact.GetFixtureB().GetBody().userData;
      objA.handleCollision(objB);
    }

    function createContactListener() {
      var contactListener = new Box2D.JSContactListener();
      contactListener.BeginContact = function (_) {};
      contactListener.EndContact = function (_) {};
      contactListener.PreSolve  = function (contact, manifold) {};
      contactListener.PostSolve = postSolve;
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
      inputHandler.setHandler(InputHandler.KEY_DOWN, function(down) {});
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
      this.foregroundScrollableLayer.addChild(this.foregroundLayer);
      this.foregroundScrollableLayer.addChild(this.backgroundLayer);
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

    module.Level1 = function(globalState) {
      Level.call(this, globalState, {
        worldWidth: 3000,
        worldHeight: 600,
      });

      var character = new Entities.Character(this.world);
      this.foregroundLayer.addChild(character.sprite);
      this.animatableObjects.push(character);
      this.physicsObjects.push(character);
      this.character = character;
      setInputHandlersForCharacter(globalState.inputHandler, this);

      // TODO define level...
      var dirtFloorOpts = {
        imagePath: "assets/dirt-floor.png",
        width: 3000,
        height: 64,
        x: 1500,
        y: 600 - 32
      };
      var dirtFloor = new Entities.StaticObstacle(this.world, dirtFloorOpts);
      this.backgroundLayer.addChild(dirtFloor.sprite);
    };

    return module;
  });
