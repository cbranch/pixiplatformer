var backgroundColor = 0xDEF7FF;
var viewportWidth = 1000;
var viewportHeight = 600;
var containerElementId = 'game';

function main() {
  // create an new instance of a pixi stage
  var stage = new PIXI.Stage(backgroundColor);
  // create a renderer instance.
  var renderer = PIXI.autoDetectRenderer(viewportWidth, viewportHeight);
  // add the renderer view element to the DOM
  document.getElementById(containerElementId).appendChild(renderer.view);
  requestAnimFrame(animate);
  function animate() {
    requestAnimFrame(animate);
    // render the stage
    renderer.render(stage);
  }
}

window.onload = main;
