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
      actor.body.ApplyLinearImpulse(new Box2D.b2Vec2(0, -8), actor.body.GetWorldCenter());
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
    this.bodyFixture = this.body.CreateFixture(bodyFixtureDef);
    var characterFeetShape = new Box2D.b2CircleShape();
    characterFeetShape.set_m_p(new Box2D.b2Vec2(0.0, 0.490));
    characterFeetShape.set_m_radius(0.335);
    var feetFixtureDef = new Box2D.b2FixtureDef();
    feetFixtureDef.set_shape(characterFeetShape);
    feetFixtureDef.set_friction(1.0);
    feetFixtureDef.set_density(1.0);
    this.feetFixture = this.body.CreateFixture(feetFixtureDef);

    this.jumpState = new FallingState(this);
    this.movingLeft = false;
    this.movingRight = false;
    this.movingDown = false;
    this.collectables = 0;
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
  Character.prototype.moveDown = function(down) {
    this.movingDown = down;
  };

  function StaticObject(world, o) {
    var texture = PIXI.Texture.fromImage(o.imagePath);
    var sprite = new PIXI.TilingSprite (texture, o.width, o.height);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    this.sprite = sprite;
    this.sprite.position.set(o.x, o.y);
    if ('angle' in o) {
      this.sprite.rotation = o.angle;
    }
  }

  function initializeBody(obj, world, o) {
    var bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_position(new Box2D.b2Vec2(o.x / 100, o.y / 100));
    if ('angle' in o) {
      bodyDef.set_angle(o.angle);
    }
    var body = world.CreateBody(bodyDef);
    body.userData = obj;
    return body;
  }

  function StaticObstacle(world, o) {
    StaticObject.call(this, world, o);

    this.body = initializeBody(this, world, o);
    var shapeDef = new Box2D.b2PolygonShape();
    shapeDef.SetAsBox(o.width / 200, o.height / 200);
    this.body.CreateFixture(shapeDef, 1.0);
  }
  StaticObstacle.prototype = Object.create (StaticObject.prototype);
  StaticObstacle.prototype.constructor = StaticObstacle;

  function StaticPlatform(world, o) {
    StaticObject.call(this, world, o);

    this.body = initializeBody(this, world, o);
    var shapeDef = new Box2D.b2PolygonShape();
    shapeDef.SetAsBox(o.width / 200, o.height / 200);
    this.body.CreateFixture(shapeDef, 1.0);
    var sensorDef = new Box2D.b2PolygonShape();
    sensorDef.SetAsBox(o.width / 200, 0.1, new Box2D.b2Vec2 (0.0, -o.height / 200 - 0.1), 0.0);
    var sensorFixtureDef = new Box2D.b2FixtureDef();
    sensorFixtureDef.set_shape(sensorDef);
    sensorFixtureDef.set_isSensor(true);
    sensorFixtureDef.set_density(1.0);
    this.sensorFixture = this.body.CreateFixture(sensorFixtureDef);
  }
  StaticPlatform.prototype = Object.create (StaticObject.prototype);
  StaticPlatform.prototype.constructor = StaticObstacle;

  function Collectable(world, o) {
    StaticObject.call(this, world, o);

    this.body = initializeBody(this, world, o);
    var sensorDef = new Box2D.b2PolygonShape();
    sensorDef.SetAsBox(o.width / 200, o.height / 200);
    var sensorFixtureDef = new Box2D.b2FixtureDef();
    sensorFixtureDef.set_shape(sensorDef);
    sensorFixtureDef.set_isSensor(true);
    sensorFixtureDef.set_density(1.0);
    this.sensorFixture = this.body.CreateFixture(sensorFixtureDef);
  }
  Collectable.prototype = Object.create (StaticObject.prototype);
  Collectable.prototype.constructor = StaticObstacle;

  function characterStaticCollision(character, staticObject) {
    var newState = character.jumpState.onFloor();
    if (newState) {
      character.jumpState = newState;
    }
  }

  function characterPlatformCollision(character, platform, contact) {
    if (character.movingDown) {
      contact.disableThisStep = true;
    }
    if ((contact.GetFixtureA() == character.feetFixture) ||
        (contact.GetFixtureB() == character.feetFixture)) {
      if ((contact.GetFixtureA() == platform.sensorFixture) ||
          (contact.GetFixtureB() == platform.sensorFixture)) {
        platform.supportPlayer = true;
      } else {
        var yVelocity = character.body.GetLinearVelocity().get_y();
        if (yVelocity < -1) {
          contact.disableThisStep = true;
          return;
        } else {
          if (platform.supportPlayer !== true) {
            contact.disableThisStep = true;
            return;
          }
        }
        var newState = character.jumpState.onFloor();
        if (newState) {
          character.jumpState = newState;
        }
      }
    } else {
      contact.disableThisStep = true;
    }
  }

  var handleCollision = Match(
    MatchTypes(
      instanceOf(Character), instanceOf(StaticObstacle), instanceOf(Box2D.b2Contact),
      characterStaticCollision
    ),
    MatchTypes(
      instanceOf(StaticObstacle), instanceOf(Character), instanceOf(Box2D.b2Contact),
      function (a, b, contact) { characterStaticCollision(b, a, contact); }
    ),
    MatchTypes(
      instanceOf(Character), instanceOf(StaticPlatform), instanceOf(Box2D.b2Contact),
      characterPlatformCollision
    ),
    MatchTypes(
      instanceOf(StaticPlatform), instanceOf(Character), instanceOf(Box2D.b2Contact),
      function (a, b, contact) { characterPlatformCollision(b, a, contact); }
    )
  );

  function characterPlatformCollisionContinuous(character, platform, contact) {
    if (character.movingDown) {
      platform.supportPlayer = false;
      contact.disableThisStep = true;
    }
  }

  var handleCollisionContinuous = Match(
    MatchTypes(
      instanceOf(Character), instanceOf(StaticPlatform), instanceOf(Box2D.b2Contact),
      characterPlatformCollisionContinuous
    ),
    MatchTypes(
      instanceOf(StaticPlatform), instanceOf(Character), instanceOf(Box2D.b2Contact),
      function (a, b, contact) { characterPlatformCollisionContinuous(b, a, contact); }
    )
  );

  function characterHandleCollisionEnd(character, platform, contact) {
    if (((contact.GetFixtureA() == platform.sensorFixture) &&
        (contact.GetFixtureB() == character.feetFixture)) ||
        ((contact.GetFixtureB() == platform.sensorFixture) &&
        (contact.GetFixtureA() == character.feetFixture))) {
      platform.supportPlayer = false;
    }
  }

  var handleCollisionEnd = Match(
    MatchTypes(
      instanceOf(Character), instanceOf(StaticPlatform), instanceOf(Box2D.b2Contact),
      characterHandleCollisionEnd
    ),
    MatchTypes(
      instanceOf(StaticPlatform), instanceOf(Character), instanceOf(Box2D.b2Contact),
      function (a, b, contact) { characterHandleCollisionEnd(b, a, contact); }
    )
  );

  function WorldEdge() {
  }

  return {
    Character: Character,
    StaticObject: StaticObject,
    StaticObstacle: StaticObstacle,
    StaticPlatform: StaticPlatform,
    Collectable: Collectable,
    WorldEdge: WorldEdge,
    handleCollision: handleCollision,
    handleCollisionContinuous: handleCollisionContinuous,
    handleCollisionEnd: handleCollisionEnd
  };
});
