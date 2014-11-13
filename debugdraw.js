// Gets a JSDraw instance which renders to a PIXI graphics object.
// graphics: an instance of PIXI.Graphics
// scale: the scaling factor to convert from Box2D coordinates to screen pixels
function getPIXIDebugDraw(graphics, scale) {
  function getColorFromDebugDrawCallback(color) {
    var col = Box2D.wrapPointer(color, Box2D.b2Color);
    var red = (col.get_r() * 255)|0;
    var green = (col.get_g() * 255)|0;
    var blue = (col.get_b() * 255)|0;
    return "#" + red + "," + green + "," + blue;
  }
  function drawSegment(graphics, vert1, vert2, color) {
    var vert1V = Box2D.wrapPointer(vert1, Box2D.b2Vec2);
    var vert2V = Box2D.wrapPointer(vert2, Box2D.b2Vec2);
    graphics.lineStyle(1, color, 1);
    graphics.moveTo(vert1V.get_x() * scale, vert1V.get_y() * scale);
    graphics.lineTo(vert2V.get_x() * scale, vert2V.get_y() * scale);
  }
  function drawPolygon(graphics, vertices, vertexCount, fill, color) {
    graphics.lineStyle(1, color, 1);
    if (fill) {
      graphics.beginFill(color, 0.5);
    }
    for(tmpI=0;tmpI<vertexCount;tmpI++) {
      var vert = Box2D.wrapPointer(vertices+(tmpI*8), Box2D.b2Vec2);
      if ( tmpI === 0 )
        graphics.moveTo(vert.get_x() * scale, vert.get_y() * scale);
      else
        graphics.lineTo(vert.get_x() * scale, vert.get_y() * scale);
    }
    if (fill) {
      graphics.endFill();
    }
  }
  function drawCircle(graphics, center, radius, axis, fill, color) {
    var centerV = Box2D.wrapPointer(center, Box2D.b2Vec2);
    var axisV = Box2D.wrapPointer(axis, Box2D.b2Vec2);

    graphics.lineStyle(1, color, 1);
    if (fill) {
      graphics.beginFill(color, 0.5);
    }
    graphics.arc(centerV.get_x() * scale, centerV.get_y() * scale, radius * scale, 0, 2 * Math.PI, false);
    if (fill) {
      graphics.endFill();
    }

    if (fill) {
      //render axis marker
      var vert2V = copyVec2(centerV);
      vert2V.op_add( scaledVec2(axisV, radius) );
      context.moveTo(centerV.get_x() * scale, centerV.get_y() * scale);
      context.lineTo(vert2V.get_x() * scale, vert2V.get_y() * scale);
    }
  }
  function drawAxes(graphics, x, y, angle) {
    var sin = Math.sin(angle);
    var cos = Math.cos(angle);
    var newX = x * scale;
    var newY = y * scale;
    function transform(x, y) { return { x: x * cos + y * sin, y: -x * sin + y * cos }; }
    var origin = transform(newX, newY);
    var xAxis = transform(newX + 100, newY);
    var yAxis = transform(newX, newY + 100);
    graphics.lineStyle(2, 'rgb(192,0,0)', 1);
    graphics.moveTo(origin.x, origin.y);
    graphics.lineTo(xAxis.x, xAxis.y);
    graphics.lineStyle(2, 'rgb(0,192,0)', 1);
    graphics.moveTo(origin.x, origin.y);
    graphics.lineTo(yAxis.x, yAxis.y);
  }
  function drawTransform(transform) {
    var trans = Box2D.wrapPointer(transform, Box2D.b2Transform);
    var pos = trans.get_p();
    var rot = trans.get_q();
    drawAxes(graphics, pos.get_x(), pos.get_y(), rot.GetAngle());
  }

  var debugDraw = new Box2D.JSDraw();
  debugDraw.DrawSegment = function(vert1, vert2, color) {
    drawSegment(graphics, vert1, vert2, getColorFromDebugDrawCallback(color));
  };
  debugDraw.DrawPolygon = function(vertices, vertexCount, color) {
    drawPolygon(graphics, vertices, vertexCount, false, getColorFromDebugDrawCallback(color));
  };
  debugDraw.DrawSolidPolygon = function(vertices, vertexCount, color) {
    drawPolygon(graphics, vertices, vertexCount, true, getColorFromDebugDrawCallback(color));
  };
  debugDraw.DrawCircle = function(center, radius, color) {
    drawCircle(graphics, center, radius, Box2D.b2Vec2(0,0), false, getColorFromDebugDrawCallback(color));
  };
  debugDraw.DrawSolidCircle = function(center, radius, axis, color) {
    drawCircle(graphics, center, radius, axis, true, getColorFromDebugDrawCallback(color));
  };
  debugDraw.DrawTransform = function(transform) {
    drawTransform(graphics, transform);
  };
  return debugDraw;
}
