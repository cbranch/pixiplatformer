var backgroundColor = 0xDEF7FF;
var viewportWidth = 1000;
var viewportHeight = 600;
var containerElementId = 'game';

var gameActive = true;
var debugDrawActive = false;
var animatableObjects = [];
var physicsObjects = [];
var debugGraphics = new PIXI.Graphics();

function updatePhysics(world, dt) {
  world.Step(dt / 1000, 3, 2);
  physicsObjects.map(function(x) {
    x.physics(dt);
  });
}

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
  self.body = world.CreateBody(bodyDef);
  var shapeDef = new Box2D.b2PolygonShape();
  shapeDef.SetAsBox(0.335, 0.825);
  var fixtureDef = new Box2D.b2FixtureDef();
  fixtureDef.set_shape(shapeDef);
  fixtureDef.set_friction(0.3);
  fixtureDef.set_density(1.0);
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

function setupStage(stage, world) {
  var character = new Character(world);
  stage.addChild(character.sprite);
  animatableObjects.push(character);
  physicsObjects.push(character);

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
  physicsObjects.push(dirtFloor);
  animatableObjects.push(dirtFloor);
}

function startAnimation(stage, world, renderer, stats) {
  var previousTimestamp = 0;
  var physicsTimestamp = 0;
  var physicsDuration = 1000 / 120; // 120fps
  function updateDisplay(world, dt) {
    animatableObjects.map(function(x) { x.animate(dt); });
    debugGraphics.clear();
    if (debugDrawActive) {
      world.DrawDebugData();
    }
    renderer.render(stage);
  }
  function animate(currentTimestamp) {
    stats.begin();
    while (currentTimestamp > physicsTimestamp) {
      physicsTimestamp += physicsDuration;
      updatePhysics(world, physicsDuration);
    }
    updateDisplay(world, physicsTimestamp - currentTimestamp);
    stats.end();
    if (gameActive) {
      requestAnimFrame(animate);
    }
  }
  // Avoid skipping ahead in the animation too soon due to initialisation delays
  function initialFrame(currentTimestamp) {
    previousTimestamp = currentTimestamp;
    physicsTimestamp = currentTimestamp;
    requestAnimFrame(animate);
  }
  requestAnimFrame(initialFrame);
}

function updateDebugDrawState() {
  debugDrawActive = document.getElementById('debugDraw').checked;
}

function main() {
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
  var debugDraw = getPIXIDebugDraw(debugGraphics, 100);
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
  setupStage(stage, world);
  startAnimation(stage, world, renderer, stats);
}

window.onload = main;
