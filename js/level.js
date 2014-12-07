define(['pixi','box2d','entities','inputhandler'],
  function(PIXI, Box2D, Entities, InputHandler) {

    var module = {};

    function setPaused(levelState, down) {
      if (down) {
        levelState.paused = !levelState.paused;
      }
    }

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

    module.createLevel = function(globalState) {
      var levelState = {
        globalState: globalState,
        paused: false,
        pauseLayer: null,
        stage: null,
        world: null,
        worldWidth: 3000,
        worldHeight: 600,
        character: null,
        animatableObjects: [],
        physicsObjects: [],
        backgroundLayer: null,
        foregroundLayer: null,
        foregroundScrollableLayer: null,
        endLevel: false,
        onLevelEnded: function () {}
      };
      // setup box2d
      var world = new Box2D.b2World(new Box2D.b2Vec2(0, 9.8));
      levelState.world = world;
      var contactListener = new Box2D.JSContactListener();
      contactListener.BeginContact = function (_) {};
      contactListener.EndContact = function (_) {};
      contactListener.PreSolve  = function (contact, manifold) {};
      contactListener.PostSolve = postSolve;
      world.SetContactListener(contactListener);
      world.SetDebugDraw(globalState.debugDraw);
      // create an new instance of a pixi stage
      var stage = new PIXI.Stage(globalState.backgroundColor);
      levelState.stage = stage;
      levelState.backgroundLayer = new PIXI.DisplayObjectContainer();
      levelState.foregroundLayer = new PIXI.DisplayObjectContainer();
      levelState.foregroundScrollableLayer = new PIXI.DisplayObjectContainer();
      levelState.foregroundScrollableLayer.addChild(levelState.foregroundLayer);
      levelState.foregroundScrollableLayer.addChild(levelState.backgroundLayer);
      levelState.foregroundScrollableLayer.addChild(globalState.debugGraphics);

      var character = new Entities.Character(world);
      levelState.foregroundLayer.addChild(character.sprite);
      levelState.animatableObjects.push(character);
      levelState.physicsObjects.push(character);
      levelState.character = character;
      globalState.inputHandler.setHandler(InputHandler.KEY_P, function(down) {
        setPaused(levelState, down);
      });
      globalState.inputHandler.setHandler(InputHandler.KEY_SPACE, function(down) {
        if (levelState.character) {
          levelState.character.handleJumpInput(down);
        }
      });
      globalState.inputHandler.setHandler(InputHandler.KEY_LEFT, function(down) {
        if (levelState.character) {
          levelState.character.moveLeft(down);
        }
      });
      globalState.inputHandler.setHandler(InputHandler.KEY_RIGHT, function(down) {
        if (levelState.character) {
          levelState.character.moveRight(down);
        }
      });
      globalState.inputHandler.setHandler(InputHandler.KEY_UP, function(down) {});
      globalState.inputHandler.setHandler(InputHandler.KEY_DOWN, function(down) {});

      // TODO define level...
      var dirtFloorOpts = {
        imagePath: "assets/dirt-floor.png",
        width: 3000,
        height: 64,
        x: 1500,
        y: 600 - 32
      };
      var dirtFloor = new Entities.StaticObstacle(world, dirtFloorOpts);
      levelState.backgroundLayer.addChild(dirtFloor.sprite);

      function defineWorldEdge(x1, y1, x2, y2) {
        var bodyDef = new Box2D.b2BodyDef();
        bodyDef.set_position(new Box2D.b2Vec2((x2 - x1) / 2, (y2 - y1) / 2));
        var body = world.CreateBody(bodyDef);
        body.userData = new Entities.WorldEdge();
        var worldEdgeDef = new Box2D.b2EdgeShape();
        worldEdgeDef.Set(new Box2D.b2Vec2(x1, y1), new Box2D.b2Vec2(x2, y2));
        body.CreateFixture(worldEdgeDef, 1.0);
      }
      defineWorldEdge(0, -10, 0, levelState.worldHeight / 100 + 10);
      defineWorldEdge(levelState.worldWidth / 100, -10,
                      levelState.worldWidth / 100, levelState.worldHeight / 100 + 10);

      levelState.pauseLayer = new PIXI.DisplayObjectContainer();
      var pauseText = new PIXI.Text("PAUSED", {
        font: 'bold 48px Helvetica Neue, Arial, sans-serif',
        fill: 'white',
        stroke: 'black',
        strokeThickness: 6
      });
      pauseText.anchor = new PIXI.Point(0.5, 0.5);
      pauseText.x = 500;
      pauseText.y = 300;
      levelState.pauseLayer.addChild(pauseText);

      stage.addChild(levelState.foregroundScrollableLayer);
      stage.addChild(levelState.pauseLayer);
      levelState.pauseLayer.visible = false;

      return levelState;
    };

    return module;
  });
