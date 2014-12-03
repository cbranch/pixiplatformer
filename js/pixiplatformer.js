define(['pixi','box2d','stats','debugdraw','inputhandler','entities'],
       function(PIXI, Box2D, Stats, DebugDraw, InputHandler, Entities) {

  var backgroundColor = 0xDEF7FF;
  var viewportWidth = 1000;
  var viewportHeight = 600;
  var containerElementId = 'game';
  var debugDrawId = 'debugDraw';

  function setPaused(globalState, down) {
    if (down) {
      globalState.paused = !globalState.paused;
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

  function setupLevel(globalState) {
    // setup box2d
    var world = new Box2D.b2World(new Box2D.b2Vec2(0, 9.8));
    globalState.world = world;
    var contactListener = new Box2D.JSContactListener();
    contactListener.BeginContact = function (_) {};
    contactListener.EndContact = function (_) {};
    contactListener.PreSolve  = function (contact, manifold) {};
    contactListener.PostSolve = postSolve;
    world.SetContactListener(contactListener);
    world.SetDebugDraw(globalState.debugDraw);
    // create an new instance of a pixi stage
    var stage = new PIXI.Stage(backgroundColor);
    globalState.stage = stage;
    globalState.backgroundLayer = new PIXI.DisplayObjectContainer();
    globalState.foregroundLayer = new PIXI.DisplayObjectContainer();
    globalState.foregroundScrollableLayer = new PIXI.DisplayObjectContainer();
    globalState.foregroundScrollableLayer.addChild(globalState.foregroundLayer);
    globalState.foregroundScrollableLayer.addChild(globalState.backgroundLayer);
    globalState.foregroundScrollableLayer.addChild(globalState.debugGraphics);

    var character = new Entities.Character(world);
    globalState.foregroundLayer.addChild(character.sprite);
    globalState.animatableObjects.push(character);
    globalState.physicsObjects.push(character);
    globalState.character = character;
    globalState.inputHandler.setHandler(InputHandler.KEY_P, function(down) {
      setPaused(globalState, down);
    });
    globalState.inputHandler.setHandler(InputHandler.KEY_SPACE, function(down) {
      if (globalState.character) {
        globalState.character.handleJumpInput(down);
      }
    });
    globalState.inputHandler.setHandler(InputHandler.KEY_LEFT, function(down) {
      if (globalState.character) {
        globalState.character.moveLeft(down);
      }
    });
    globalState.inputHandler.setHandler(InputHandler.KEY_RIGHT, function(down) {
      if (globalState.character) {
        globalState.character.moveRight(down);
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
    globalState.backgroundLayer.addChild(dirtFloor.sprite);

    function defineWorldEdge(x1, y1, x2, y2) {
      var bodyDef = new Box2D.b2BodyDef();
      bodyDef.set_position(new Box2D.b2Vec2((x2 - x1) / 2, (y2 - y1) / 2));
      var body = world.CreateBody(bodyDef);
      body.userData = new Entities.WorldEdge();
      var worldEdgeDef = new Box2D.b2EdgeShape();
      worldEdgeDef.Set(new Box2D.b2Vec2(x1, y1), new Box2D.b2Vec2(x2, y2));
      body.CreateFixture(worldEdgeDef, 1.0);
    }
    defineWorldEdge(0, -10, 0, globalState.worldHeight / 100 + 10);
    defineWorldEdge(globalState.worldWidth / 100, -10,
                    globalState.worldWidth / 100, globalState.worldHeight / 100 + 10);

    globalState.pauseLayer = new PIXI.DisplayObjectContainer();
    var pauseText = new PIXI.Text("PAUSED", {
      font: 'bold 48px Helvetica Neue, Arial, sans-serif',
      fill: 'white',
      stroke: 'black',
      strokeThickness: 6
    });
    pauseText.anchor = new PIXI.Point(0.5, 0.5);
    pauseText.x = 500;
    pauseText.y = 300;
    globalState.pauseLayer.addChild(pauseText);

    stage.addChild(globalState.foregroundScrollableLayer);
    stage.addChild(globalState.pauseLayer);
    globalState.pauseLayer.visible = false;
  }

  function gameLoop(globalState, renderer) {
    var world = globalState.world;
    var stage = globalState.stage;
    var stats = globalState.stats;
    var physicsTimestamp = 0;
    var physicsDuration = 1000 / 120; // 120fps
    var inputHandler = globalState.inputHandler;
    function updatePhysics(dt) {
      world.Step(dt / 1000, 3, 2);
      globalState.physicsObjects.map(function(x) {
        x.physics(dt);
      });
    }
    function updateScrolling() {
      var characterPos = globalState.character.body.GetPosition();
      var maxScrollX = -globalState.worldWidth + globalState.screenWidth;
      var maxScrollY = -globalState.worldHeight + globalState.screenHeight;
      var scrollX = globalState.screenWidth / 2 + characterPos.get_x() * -100;
      var scrollY = globalState.screenHeight / 2 + characterPos.get_y() * -100;
      globalState.foregroundScrollableLayer.x = Math.min(0, Math.max(maxScrollX, scrollX));
      globalState.foregroundScrollableLayer.y = Math.min(0, Math.max(maxScrollY, scrollY));
    }
    function updateDisplay(dt) {
      globalState.animatableObjects.map(function(x) { x.animate(dt); });
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
      if (!globalState.paused) {
        inputHandler.processInput();
        while (currentTimestamp > physicsTimestamp) {
          physicsTimestamp += physicsDuration;
          updatePhysics(physicsDuration);
        }
        if (pauseMessageShown) {
          pauseMessageShown = false;
          globalState.pauseLayer.visible = false;
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
          globalState.pauseLayer.visible = true;
          renderer.render(stage);
        }
      }
      stats.end();
      requestAnimationFrame(tick);
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
      paused: false,
      stats: null,
      stage: null,
      world: null,
      inputHandler: null,
      debugDraw: null,
      debugGraphics: null,
      character: null,
      animatableObjects: [],
      physicsObjects: [],
      backgroundLayer: null,
      foregroundLayer: null,
      foregroundScrollableLayer: null,
      worldWidth: 3000,
      worldHeight: 600,
      screenWidth: 1000,
      screenHeight: 600,
      pauseLayer: null
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
    setupLevel(globalState);
    // let's go
    gameLoop(globalState, renderer);
  }

  return function () {
    main();
  };
});
