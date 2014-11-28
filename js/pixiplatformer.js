define(['pixi','box2d','stats','debugdraw','inputhandler','entities'],
       function(PIXI, Box2D, Stats, DebugDraw, InputHandler, Entities) {
  var backgroundColor = 0xDEF7FF;
  var viewportWidth = 1000;
  var viewportHeight = 600;
  var containerElementId = 'game';

  var debugDrawActive = false;
  var debugGraphics = new PIXI.Graphics();

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

  function setupStage(globalState, stage, world) {
    globalState.backgroundLayer = new PIXI.DisplayObjectContainer();
    globalState.foregroundLayer = new PIXI.DisplayObjectContainer();

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

    // TODO define level...
    var dirtFloor = new Entities.StaticObject(world,
        {
          imagePath: "assets/dirt-floor.png",
          width: 1000,
          height: 64,
          x: 500,
          y: 600 - 32
        });
    globalState.backgroundLayer.addChild(dirtFloor.sprite);

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

    stage.addChild(globalState.foregroundLayer);
    stage.addChild(globalState.backgroundLayer);
    stage.addChild(globalState.pauseLayer);
    globalState.pauseLayer.visible = false;
  }

  function gameLoop(globalState, stage, world, renderer, stats) {
    var physicsTimestamp = 0;
    var physicsDuration = 1000 / 120; // 120fps
    var inputHandler = globalState.inputHandler;
    function updatePhysics(dt) {
      world.Step(dt / 1000, 3, 2);
      globalState.physicsObjects.map(function(x) {
        x.physics(dt);
      });
    }
    function updateDisplay(dt) {
      globalState.animatableObjects.map(function(x) { x.animate(dt); });
      debugGraphics.clear();
      if (debugDrawActive) {
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

  function updateDebugDrawState() {
    debugDrawActive = document.getElementById('debugDraw').checked;
  }

  function main() {
    var globalState = {
      paused: false,
      character: null,
      inputHandler: null,
      animatableObjects: [],
      physicsObjects: [],
      backgroundLayer: null,
      foregroundLayer: null,
      pauseLayer: null
    };
    globalState.inputHandler = new InputHandler();
    var containerElement = document.getElementById(containerElementId);
    // create an new instance of a pixi stage
    var stage = new PIXI.Stage(backgroundColor);
    // create a renderer instance.
    var renderer = PIXI.autoDetectRenderer(viewportWidth, viewportHeight);
    // setup box2d
    var world = new Box2D.b2World(new Box2D.b2Vec2(0, 9.8));
    var contactListener = new Box2D.JSContactListener();
    contactListener.BeginContact = function (_) {};
    contactListener.EndContact = function (_) {};
    contactListener.PreSolve  = function (contact, manifold) {};
    contactListener.PostSolve = postSolve;
    world.SetContactListener(contactListener);
    // box2d debug draw
    debugGraphics = new PIXI.Graphics();
    stage.addChild(debugGraphics);
    var debugDraw = DebugDraw.getPIXIDebugDraw(debugGraphics, 100);
    world.SetDebugDraw(debugDraw);
    var e_shapeBit = 0x0001;
    var e_jointBit = 0x0002;
    var e_aabbBit = 0x0004;
    var e_pairBit = 0x0008;
    var e_centerOfMassBit = 0x0010;
    debugDraw.SetFlags(e_shapeBit | e_aabbBit);
    updateDebugDrawState();
    // FPS stats
    var stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.right = '0px';
    stats.domElement.style.bottom = '0px';
    containerElement.appendChild(stats.domElement);
    // add the renderer view element to the DOM
    containerElement.appendChild(renderer.view);
    globalState.inputHandler.setupInput();
    setupStage(globalState, stage, world);
    gameLoop(globalState, stage, world, renderer, stats);
  }

  return function () {
    main();
  };
});
