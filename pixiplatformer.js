define(['pixi','box2d','stats','debugdraw','inputhandler'],
       function(PIXI, Box2D, Stats, DebugDraw, InputHandler) {
  var backgroundColor = 0xDEF7FF;
  var viewportWidth = 1000;
  var viewportHeight = 600;
  var containerElementId = 'game';

  var gameActive = true;
  var debugDrawActive = false;
  var debugGraphics = new PIXI.Graphics();

  function Character(world) {
    var self = this;
    var characterTexture = PIXI.Texture.fromImage("assets/character.png");
    var sprite = new PIXI.Sprite (characterTexture);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    self.sprite = sprite;

    var bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_type(Box2D.b2_dynamicBody);
    bodyDef.set_position(new Box2D.b2Vec2(5, 0));
    bodyDef.set_fixedRotation(true);
    self.body = world.CreateBody(bodyDef);
    var shapeDef = new Box2D.b2PolygonShape();
    shapeDef.SetAsBox(0.335, 0.825);
    var fixtureDef = new Box2D.b2FixtureDef();
    fixtureDef.set_shape(shapeDef);
    fixtureDef.set_friction(0.3);
    fixtureDef.set_density(1.0);
    self.body.CreateFixture(shapeDef, 1.0);

    self.physics = function(dt) {
    };
    self.animate = function(dt) {
      var pos = self.body.GetPosition();
      self.sprite.position.set(pos.get_x() * 100, pos.get_y() * 100);
      self.sprite.rotation = self.body.GetAngle();
    };
    self.tryToJump = function() {
      // TODO Should only jump if we're on the ground
      // TODO Should continue to apply force for a short time unless we let go of jump
      self.body.ApplyLinearImpulse(new Box2D.b2Vec2(0, -6), self.body.GetWorldCenter());
    };
  }

  function StaticObject(world, o) {
    var self = this;
    var texture = PIXI.Texture.fromImage(o.imagePath);
    var sprite = new PIXI.TilingSprite (texture, o.width, o.height);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    self.sprite = sprite;

    var bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_position(new Box2D.b2Vec2(o.x / 100, o.y / 100));
    self.body = world.CreateBody(bodyDef);
    var shapeDef = new Box2D.b2PolygonShape();
    shapeDef.SetAsBox(o.width / 200, o.height / 200);
    self.body.CreateFixture(shapeDef, 1.0);

    // Simple animation to demonstrate the concept for now...
    self.easeCurve = 0;
    self.physics = function(dt) {
    };
    self.animate = function(dt) {
      var pos = self.body.GetPosition();
      self.sprite.position.set(pos.get_x() * 100, pos.get_y() * 100);
      self.sprite.rotation = self.body.GetAngle();
    };
  }

  function handleJumpInput(globalState, down) {
    if (down) {
      if (globalState.character) {
        globalState.character.tryToJump();
      }
    }
  }

  function setupStage(globalState, stage, world) {
    var character = new Character(world);
    stage.addChild(character.sprite);
    globalState.animatableObjects.push(character);
    globalState.physicsObjects.push(character);
    globalState.character = character;
    globalState.inputHandler.setHandler(InputHandler.KEY_SPACE, function(down) {
      handleJumpInput(globalState, down);
    });

    // TODO define level...
    var dirtFloor = new StaticObject(world,
        {
          imagePath: "assets/dirt-floor.png",
          width: 1000,
          height: 64,
          x: 500,
          y: 600 - 32
        });
    stage.addChild(dirtFloor.sprite);
    globalState.physicsObjects.push(dirtFloor);
    globalState.animatableObjects.push(dirtFloor);
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
    function tick(currentTimestamp) {
      stats.begin();
      inputHandler.processInput();
      while (currentTimestamp > physicsTimestamp) {
        physicsTimestamp += physicsDuration;
        updatePhysics(physicsDuration);
      }
      updateDisplay(physicsTimestamp - currentTimestamp);
      stats.end();
      if (gameActive) {
        requestAnimFrame(tick);
      }
    }
    function captureFirstTimestamp(currentTimestamp) {
      physicsTimestamp = currentTimestamp;
      tick();
    }
    requestAnimFrame(captureFirstTimestamp);
  }

  function updateDebugDrawState() {
    debugDrawActive = document.getElementById('debugDraw').checked;
  }

  function main() {
    var globalState = {
      character: null,
      inputHandler: null,
      animatableObjects: [],
      physicsObjects: [],
    };
    globalState.inputHandler = new InputHandler();
    var containerElement = document.getElementById(containerElementId);
    // create an new instance of a pixi stage
    var stage = new PIXI.Stage(backgroundColor);
    // create a renderer instance.
    var renderer = PIXI.autoDetectRenderer(viewportWidth, viewportHeight);
    // setup box2d
    var world = new Box2D.b2World(new Box2D.b2Vec2(0, 9.8));
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
