define(['pixi','box2d','stats','debugdraw','inputhandler','level'],
       function(PIXI, Box2D, Stats, DebugDraw, InputHandler, Level) {

  var backgroundColor = 0xDEF7FF;
  var viewportWidth = 1000;
  var viewportHeight = 600;
  var containerElementId = 'game';
  var debugDrawId = 'debugDraw';

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
      if (levelState.character.body.GetPosition().get_y() > levelState.worldHeight / 100) {
        levelState.character.body.SetTransform(
          new Box2D.b2Vec2(levelState.characterOpts.x / 100, levelState.characterOpts.y / 100), 0);
      }
    }
    function updateScrolling() {
      var characterPos = levelState.character.body.GetPosition();
      var maxScrollX = -levelState.worldWidth + globalState.screenWidth;
      var maxScrollY = -levelState.worldHeight + globalState.screenHeight;
      var scrollX = Math.round(globalState.screenWidth / 2 + characterPos.get_x() * -100);
      var scrollY = Math.round(globalState.screenHeight / 2 + characterPos.get_y() * -100);
      levelState.foregroundScrollableLayer.x = Math.min(0, Math.max(maxScrollX, scrollX));
      levelState.foregroundScrollableLayer.y = Math.min(0, Math.max(maxScrollY, scrollY));
    }
    function updateDisplay(currentTime, dt) {
      levelState.animatableObjects.map(function(x) { x.animate(dt, currentTime, levelState); });
      levelState.updateAnimatableObjectList();
      updateScrolling();
      globalState.debugGraphics.clear();
      if (globalState.debugDraw.enable) {
        world.DrawDebugData();
      }
      renderer.render(stage);
    }
    var pauseMessageShown = false;
    function tick(currentTimestamp) {
      if (stats !== undefined) { stats.begin(); }
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
        updateDisplay(currentTimestamp, physicsTimestamp - currentTimestamp);
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
      if (stats !== undefined) { stats.end(); }
      if (!levelState.endLevel && !suspendedLoop) {
        requestAnimationFrame(tick);
      } else {
        levelState.onLevelEnded();
      }
    }
    function captureFirstTimestamp(currentTimestamp) {
      physicsTimestamp = currentTimestamp - 10;
      tick(currentTimestamp);
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

  function GlobalState(debugDrawElement) {
    this.renderer = PIXI.autoDetectRenderer(viewportWidth, viewportHeight);
    //this.stats = initStats();
    this.inputHandler = new InputHandler();
    this.inputHandler.setupInput();
    this.debugGraphics = new PIXI.Graphics();
    //this.debugDraw = createDebugDraw(this.debugGraphics, debugDrawElement);
    this.debugDraw = { enable: false };
    this.screenWidth = 1000;
    this.screenHeight = 600;
    this.backgroundColor = backgroundColor;
    this.paused = false;
    this.unsuspendLoop = function() {};
    var self = this;
    this.inputHandler.setHandler(InputHandler.KEY_P, function(down) {
      self.setPaused(down);
    }, true);
  }
  GlobalState.prototype.setPaused = function (down) {
    if (down) {
      if (this.paused) {
        this.unsuspendLoop();
      }
      this.paused = !this.paused;
    }
  };
  GlobalState.prototype.loadLevel = function (level) {
    this.currentLevel = new Level.GameLevel(this, level, this.runLevel.bind(this));
  };
  GlobalState.prototype.runLevel = function () {
    gameLoop(this, this.currentLevel, this.renderer);
  };

  function main() {
    var globalState = new GlobalState(document.getElementById(debugDrawId));
    var containerElement = document.getElementById(containerElementId);
    containerElement.appendChild(globalState.renderer.view);
    //containerElement.appendChild(globalState.stats.domElement);
    globalState.loadLevel(Level.levels[0]);
  }

  return function () {
    main();
  };
});
