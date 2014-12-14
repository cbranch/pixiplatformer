define(['pixi','box2d','multipledispatch'],
       function(PIXI, Box2D, MultipleDispatch) {
  var instanceOf = MultipleDispatch.instanceOf;
  var Match = MultipleDispatch.Match;
  var MatchTypes = MultipleDispatch.MatchTypes;

  function ReadyToJumpState() {
    this.startJump = false;
  }
  ReadyToJumpState.prototype.handleInput = function(down) {
    if (down) {
      this.startJump = true;
    }
    return this;
  };
  ReadyToJumpState.prototype.physics = function(dt, actor) {
    if (this.startJump) {
      actor.body.ApplyLinearImpulse(new Box2D.b2Vec2(0, -6), actor.body.GetWorldCenter());
      return new JumpingState();
    }
  };
  ReadyToJumpState.prototype.onFloor = function () {};
  ReadyToJumpState.prototype.restrictMovement = function () { return false; };
  function JumpingState() {
    this.timeLeftForJumping = 60;
  }
  JumpingState.prototype.handleInput = function(down) {
    if (!down) {
      return new FallingState();
    }
  };
  JumpingState.prototype.physics = function(dt, actor) {
    actor.body.ApplyForce(new Box2D.b2Vec2(0, -6), actor.body.GetWorldCenter());
    this.timeLeftForJumping--;
    if (this.timeLeftForJumping) {
      return new FallingState();
    }
  };
  JumpingState.prototype.onFloor = function () {
    return new ReadyToJumpState();
  };
  JumpingState.prototype.restrictMovement = function () { return true; };
  function FallingState() {
  }
  FallingState.prototype.handleInput = function(down) {
  };
  FallingState.prototype.physics = function(dt, actor) {
  };
  FallingState.prototype.onFloor = function () {
    return new ReadyToJumpState();
  };
  FallingState.prototype.restrictMovement = function () { return true; };

  function Character(world, opts) {
    var characterTexture = PIXI.Texture.fromImage("assets/character.png");
    var sprite = new PIXI.Sprite (characterTexture);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    this.sprite = sprite;

    var bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_type(Box2D.b2_dynamicBody);
    bodyDef.set_position(new Box2D.b2Vec2(opts.x / 100, opts.y / 100));
    bodyDef.set_fixedRotation(true);
    this.body = world.CreateBody(bodyDef);
    this.body.userData = this;
    var characterBodyShape = new Box2D.b2PolygonShape();
    characterBodyShape.SetAsBox(0.335, 0.490);
    var bodyFixtureDef = new Box2D.b2FixtureDef();
    bodyFixtureDef.set_shape(characterBodyShape);
    bodyFixtureDef.set_friction(1.0);
    bodyFixtureDef.set_density(1.0);
    this.body.CreateFixture(bodyFixtureDef);
    var characterFeetShape = new Box2D.b2CircleShape();
    characterFeetShape.set_m_p(new Box2D.b2Vec2(0.0, 0.490));
    characterFeetShape.set_m_radius(0.335);
    var feetFixtureDef = new Box2D.b2FixtureDef();
    feetFixtureDef.set_shape(characterFeetShape);
    feetFixtureDef.set_friction(1.0);
    feetFixtureDef.set_density(1.0);
    this.body.CreateFixture(feetFixtureDef);

    this.jumpState = new FallingState(this);
    this.movingLeft = false;
    this.movingRight = false;
  }
  Character.prototype.physics = function(dt) {
    var newState = this.jumpState.physics(dt, this);
    if (newState) {
      this.jumpState = newState;
    }
    var currentVelocity = this.body.GetLinearVelocity();
    var horizontalMovement = 4.0;
    var horizontalMaxMovementThisFrame = 0.05 * dt;
    if (this.jumpState.restrictMovement ()) {
      horizontalMaxMovementThisFrame /= 10.0;
    }
    var horizontalChange = 0.0;
    if (this.movingLeft) {
      if (!this.movingRight) {
        horizontalChange = -horizontalMovement - currentVelocity.get_x();
        horizontalChange = Math.min(0, Math.max(-horizontalMaxMovementThisFrame, horizontalChange));
      }
    } else if (this.movingRight) {
      horizontalChange = horizontalMovement - currentVelocity.get_x();
      horizontalChange = Math.min(horizontalMaxMovementThisFrame, Math.max(0, horizontalChange));
    }
    if (horizontalChange !== 0) {
      var impulse = this.body.GetMass() * horizontalChange;
      this.body.ApplyLinearImpulse(new Box2D.b2Vec2(impulse, 0), this.body.GetWorldCenter());
    }
  };
  Character.prototype.animate = function(dt) {
    var pos = this.body.GetPosition();
    this.sprite.position.set(pos.get_x() * 100, pos.get_y() * 100);
    this.sprite.rotation = this.body.GetAngle();
  };
  Character.prototype.handleJumpInput = function(down) {
    var newState = this.jumpState.handleInput(down);
    if (newState) {
      this.jumpState = newState;
    }
  };
  Character.prototype.moveLeft = function(down) {
    this.movingLeft = down;
  };
  Character.prototype.moveRight = function(down) {
    this.movingRight = down;
  };

  function StaticObject(o) {
    var texture = PIXI.Texture.fromImage(o.imagePath);
    var sprite = new PIXI.TilingSprite (texture, o.width, o.height);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    this.sprite = sprite;
    this.sprite.position.set(o.x, o.y);
  }

  function StaticObstacle(world, o) {
    StaticObject.call(this, o);

    var bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_position(new Box2D.b2Vec2(o.x / 100, o.y / 100));
    this.body = world.CreateBody(bodyDef);
    this.body.userData = this;
    var shapeDef = new Box2D.b2PolygonShape();
    shapeDef.SetAsBox(o.width / 200, o.height / 200);
    this.body.CreateFixture(shapeDef, 1.0);
  }
  StaticObstacle.prototype = Object.create (StaticObject.prototype);
  StaticObstacle.prototype.constructor = StaticObstacle;

  Character.prototype.handleCollision = Match(
    MatchTypes(
      instanceOf(StaticObstacle),
      function (staticObject) {
        var newState = this.jumpState.onFloor();
        if (newState) {
          this.jumpState = newState;
        }
      }
    )
  );

  StaticObstacle.prototype.handleCollision = Match(
    MatchTypes(
      instanceOf(Character),
      function (character) {
        character.handleCollision(this);
      }
    )
  );

  function WorldEdge() {
  }
  WorldEdge.prototype.handleCollision = function (o) {
    if (!(o instanceof WorldEdge)) {
      o.handleCollision (this);
    }
  };

  return {
    Character: Character,
    StaticObject: StaticObject,
    StaticObstacle: StaticObstacle,
    WorldEdge: WorldEdge
  };
});
