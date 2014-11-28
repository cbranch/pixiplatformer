require.config({
  paths: {
    'pixi': 'bower_components/pixi.js/bin/pixi.dev',
    'box2d': 'bower_components/box2d.js/box2d',
    'stats': 'bower_components/stats.js/build/stats.min',
    'inputhandler': 'js/inputhandler',
    'debugdraw': 'js/debugdraw',
    'multipledispatch': 'js/multipledispatch',
    'entities': 'js/entities',
    'pixiplatformer': 'js/pixiplatformer'
  },
  shim: {
    'box2d': {
      exports: 'Box2D'
    },
    'stats': {
      exports: 'Stats'
    }
  },
  waitSeconds: 10
});
require(['pixiplatformer'], function(pixiplatformer) {
  new pixiplatformer();
});
