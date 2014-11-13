var backgroundColor = 0xDEF7FF;
var viewportWidth = 1000;
var viewportHeight = 600;
var containerElementId = 'game';

var gameActive = true;
var animatableObjects = [];
var physicsObjects = [];

function updatePhysics(dt) {
  physicsObjects.map(function(x) { x.physics(dt); });
}

function Character() {
  var self = this;
  var characterTexture = PIXI.Texture.fromImage("assets/character.png");
  var sprite = new PIXI.Sprite (characterTexture);
  sprite.anchor.x = 0.5;
  sprite.anchor.y = 1;
  sprite.position.x = 400;
  sprite.position.y = 400;
  self.sprite = sprite;

  // Simple animation to demonstrate the concept for now...
  self.easeCurve = 0;
  self.physics = function(dt) {
    self.easeCurve += dt / 400.0;
    var offset = Math.sin(self.easeCurve) + 1;
    if (offset > 1) { offset = 2 - offset; }
    sprite.position.y = 436 + (offset * 100); //400 + (Math.sin(dt / 100) * 50);
  };
  self.animate = function(dt) {};
}

function setupStage(stage) {
  var character = new Character();
  stage.addChild(character.sprite);
  animatableObjects.push(character);
  physicsObjects.push(character);

  // TODO define level...
  var dirtFloorTexture = PIXI.Texture.fromImage("assets/dirt-floor.png");
  var dirtFloor = new PIXI.TilingSprite (dirtFloorTexture, 1000, 64);
  dirtFloor.position.x = 0;
  dirtFloor.position.y = 600 - 64;
  stage.addChild(dirtFloor);
}

function startAnimation(stage, renderer, stats) {
  var previousTimestamp = 0;
  var physicsTimestamp = 0;
  var physicsDuration = 1000 / 120; // 120fps
  function updateDisplay(dt) {
    animatableObjects.map(function(x) { x.animate(dt); });
    renderer.render(stage);
  }
  function animate(currentTimestamp) {
    stats.begin();
    while (currentTimestamp > physicsTimestamp) {
      physicsTimestamp += physicsDuration;
      updatePhysics(physicsDuration);
    }
    updateDisplay(physicsTimestamp - currentTimestamp);
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

function main() {
  var containerElement = document.getElementById(containerElementId);
  // create an new instance of a pixi stage
  var stage = new PIXI.Stage(backgroundColor);
  // create a renderer instance.
  var renderer = PIXI.autoDetectRenderer(viewportWidth, viewportHeight);
  // FPS stats
  var stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.right = '0px';
  stats.domElement.style.bottom = '0px';
  containerElement.appendChild(stats.domElement);
  // add the renderer view element to the DOM
  containerElement.appendChild(renderer.view);
  setupStage(stage);
  startAnimation(stage, renderer, stats);
}

window.onload = main;
