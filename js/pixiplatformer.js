define(['pixi','box2d','stats','debugdraw','inputhandler','entities'],
       function(PIXI, Box2D, Stats, DebugDraw, InputHandler, Entities) {

  var backgroundColor = 0xDEF7FF;
  var viewportWidth = 1000;
  var viewportHeight = 600;
  var containerElementId = 'game';
  var debugDrawId = 'debugDraw';

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

  function createLevel(globalState) {
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
    var stage = new PIXI.Stage(backgroundColor);
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
    var dirtFloor = new Entities.StaticObstacle(world,
        {
          imagePath: "assets/dirt-floor.png",
          width: 3000,
          height: 64,
          x: 1500,
          y: 600 - 32
        });
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
  }

  function gameLoop(globalState, levelState, renderer) {
    var world = levelState.world;
    var stage = levelState.stage;
    var stats = globalState.stats;
    var physicsTimestamp = 0;
    var physicsDuration = 1000 / 120; // 120fps
    var inputHandler = globalState.inputHandler;
    function updatePhysics(dt) {
      world.Step(dt / 1000, 3, 2);
      levelState.physicsObjects.map(function(x) {
        x.physics(dt);
      });
    }
    function updateScrolling() {
      var characterPos = levelState.character.body.GetPosition();
      var maxScrollX = -levelState.worldWidth + globalState.screenWidth;
      var maxScrollY = -levelState.worldHeight + globalState.screenHeight;
      var scrollX = globalState.screenWidth / 2 + characterPos.get_x() * -100;
      var scrollY = globalState.screenHeight / 2 + characterPos.get_y() * -100;
      levelState.foregroundScrollableLayer.x = Math.min(0, Math.max(maxScrollX, scrollX));
      levelState.foregroundScrollableLayer.y = Math.min(0, Math.max(maxScrollY, scrollY));
    }
    function updateDisplay(dt) {
      levelState.animatableObjects.map(function(x) { x.animate(dt); });
      updateScrolling();
      globalState.debugGraphics.clear();
      if (globalState.debugDrawActive) {
        world.DrawDebugData();
      }
      renderer.render(stage);
    }
    var pauseMessageShown = false;
    function tick(currentTimestamp) {
      stats.begin();
      if (!levelState.paused) {
        inputHandler.processInput();
        while (currentTimestamp > physicsTimestamp) {
          physicsTimestamp += physicsDuration;
          updatePhysics(physicsDuration);
        }
        if (pauseMessageShown) {
          pauseMessageShown = false;
          levelState.pauseLayer.visible = false;
        }
        updateDisplay(physicsTimestamp - currentTimestamp);
      } else {
        // Pause physics
        physicsTimestamp = currentTimestamp;
        // Allow unpause
        inputHandler.processInputSelectively([InputHandler.KEY_P]);
        // If first frame after pause, show pause message
        if (!pauseMessageShown) {
          pauseMessageShown = true;
          levelState.pauseLayer.visible = true;
          renderer.render(stage);
        }
      }
      stats.end();
      if (!levelState.endLevel) {
        requestAnimationFrame(tick);
      } else {
        levelState.onLevelEnded();
      }
    }
    function captureFirstTimestamp(currentTimestamp) {
      physicsTimestamp = currentTimestamp;
      tick();
    }
    requestAnimationFrame(captureFirstTimestamp);
  }

  function createDebugDraw(debugGraphics, debugDrawCheckbox) {
    var debugDraw = DebugDraw.getPIXIDebugDraw(debugGraphics, 100);
    var e_shapeBit = 0x0001;
    var e_jointBit = 0x0002;
    var e_aabbBit = 0x0004;
    var e_pairBit = 0x0008;
    var e_centerOfMassBit = 0x0010;
    debugDraw.SetFlags(e_shapeBit | e_aabbBit);
    function getDebugDrawState() {
      return debugDrawCheckbox.checked;
    }
    debugDraw.enable = getDebugDrawState();
    debugDrawCheckbox.onclick = function() { debugDraw.enable = getDebugDrawState(); };
    return debugDraw;
  }

  function initStats() {
    // FPS stats
    var stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.bottom = '0px';
    return stats;
  }

  function main() {
    var globalState = {
      stats: null,
      inputHandler: null,
      debugDraw: null,
      debugGraphics: null,
      screenWidth: 1000,
      screenHeight: 600
    };
    globalState.inputHandler = new InputHandler();
    globalState.inputHandler.setupInput();
    globalState.stats = initStats();
    var containerElement = document.getElementById(containerElementId);
    var renderer = PIXI.autoDetectRenderer(viewportWidth, viewportHeight);
    containerElement.appendChild(renderer.view);
    containerElement.appendChild(globalState.stats.domElement);
    globalState.debugGraphics = new PIXI.Graphics();
    globalState.debugDraw = createDebugDraw(globalState.debugGraphics, document.getElementById(debugDrawId));
    var levelState = createLevel(globalState);
    // let's go
    gameLoop(globalState, levelState, renderer);
  }

  return function () {
    main();
  };
});
