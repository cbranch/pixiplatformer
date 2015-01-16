define(['underscore','entities'],
  function(_, Entities) {
    var obstacleTypes = {};
    obstacleTypes.dirt = {
      jsType: Entities.StaticObject,
      texture: "dirt-m",
      anchor: { x: 0, y: 0 }
    };
    var dirtObjLBase = {
      texture: "dirt-l",
      width: 64,
      anchor: { x: 0, y: 0 }
    };
    obstacleTypes["dirt-l"] = _.extend({ jsType: Entities.StaticObject }, dirtObjLBase);
    obstacleTypes["dirt-wall-l"] = _.extend({ jsType: Entities.StaticObstacle }, dirtObjLBase);
    var dirtObjRBase = {
      texture: "dirt-r",
      width: 64,
      anchor: { x: 0, y: 0 }
    };
    obstacleTypes["dirt-r"] = _.extend({ jsType: Entities.StaticObject }, dirtObjRBase);
    obstacleTypes["dirt-wall-r"] = _.extend({ jsType: Entities.StaticObstacle }, dirtObjRBase);
    obstacleTypes["dirt-slope-up"] = {
      jsType: Entities.StaticObject,
      texture: "dirt-slope-up",
      width: 128,
      height: 64,
      anchor: { x: 0, y: 0 }
    };
    obstacleTypes["dirt-slope-down"] = {
      jsType: Entities.StaticObject,
      texture: "dirt-slope-down",
      width: 128,
      height: 64,
      anchor: { x: 0, y: 0 }
    };
    var groundBase = {
      texture: "ground-m",
      height: 64,
      anchor: { x: 0, y: 0 }
    };
    obstacleTypes.ground = _.extend({ jsType: Entities.StaticObstacle }, groundBase);
    obstacleTypes.platform = _.extend({ jsType: Entities.StaticPlatform }, groundBase);
    var groundLBase = {
      texture: "ground-l",
      width: 64,
      height: 64,
      anchor: { x: 0, y: 0 }
    };
    obstacleTypes["ground-l"] = _.extend({ jsType: Entities.StaticObstacle }, groundLBase);
    obstacleTypes["platform-l"] = _.extend({ jsType: Entities.StaticPlatform }, groundLBase);
    var groundRBase = {
      texture: "ground-r",
      width: 64,
      height: 64,
      anchor: { x: 0, y: 0 }
    };
    obstacleTypes["ground-r"] = _.extend({ jsType: Entities.StaticObstacle }, groundRBase);
    obstacleTypes["platform-r"] = _.extend({ jsType: Entities.StaticPlatform }, groundRBase);
    var groundSlopeUpBase = {
      texture: "ground-slope-up",
      width: 128,
      height: 64,
      anchor: { x: 0, y: 0 },
      vertices: [
        { x: 0, y: 64 },
        { x: 128, y: 0 },
        { x: 128, y: 80 },
        { x: 0, y: 80 },
      ]
    };
    obstacleTypes["ground-slope-up"] = _.extend({ jsType: Entities.StaticObstacle }, groundSlopeUpBase);
    obstacleTypes["platform-slope-up"] = _.extend({ jsType: Entities.StaticPlatform }, groundSlopeUpBase);
    var groundSlopeDownBase = {
      texture: "ground-slope-down",
      width: 128,
      height: 64,
      anchor: { x: 0, y: 0 },
      vertices: [
        { x: 0, y: 0 },
        { x: 128, y: 64 },
        { x: 128, y: 80 },
        { x: 0, y: 80 }
      ]
    };
    obstacleTypes["ground-slope-down"] = _.extend({ jsType: Entities.StaticObstacle }, groundSlopeDownBase);
    obstacleTypes["platform-slope-down"] = _.extend({ jsType: Entities.StaticPlatform }, groundSlopeDownBase);

    return obstacleTypes;
  });
