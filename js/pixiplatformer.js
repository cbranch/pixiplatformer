define(['pixi','box2d','stats','debugdraw','inputhandler','level'],
       function(PIXI, Box2D, Stats, DebugDraw, InputHandler, Level) {

  var backgroundColor = 0xDEF7FF;
  var viewportWidth = 1000;
  var viewportHeight = 600;
  var containerElementId = 'game';
  var debugDrawId = 'debugDraw';

  function setPaused(globalState, down) {
    if (down) {
      if (globalState.paused) {
        globalState.unsuspendLoop();
      }
      globalState.paused = !globalState.paused;
    }
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
      levelState.animatableObjects.map(function(x) { x.animate(dt, levelState); });
      levelState.purgeRemovedAnimatableObjects();
      updateScrolling();
      globalState.debugGraphics.clear();
      if (globalState.debugDraw.enable) {
        world.DrawDebugData();
      }
      renderer.render(stage);
    }
    var pauseMessageShown = false;
    function tick(currentTimestamp) {
      stats.begin();
      var suspendedLoop = false;
      if (!globalState.paused) {
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
        // If first frame after pause, show pause message
        pauseMessageShown = true;
        levelState.pauseLayer.visible = true;
        renderer.render(stage);
        suspendedLoop = true;
        globalState.unsuspendLoop = function () {
          requestAnimationFrame(captureFirstTimestamp);
        };
      }
      stats.end();
      if (!levelState.endLevel && !suspendedLoop) {
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
      screenHeight: 600,
      backgroundColor: backgroundColor,
      paused: false
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
    globalState.inputHandler.setHandler(InputHandler.KEY_P, function(down) {
      setPaused(globalState, down);
    }, true);
    var levelState = new Level.GameLevel(globalState, Level.levels[0]);
    // let's go
    gameLoop(globalState, levelState, renderer);
  }

  return function () {
    main();
  };
});
