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
  JumpingState.prototype.onFloor = function () {};
  function FallingState() {
  }
  FallingState.prototype.handleInput = function(down) {
  };
  FallingState.prototype.physics = function(dt, actor) {
  };
  FallingState.prototype.onFloor = function () {
    return new ReadyToJumpState();
  };

  function Character(world) {
    var characterTexture = PIXI.Texture.fromImage("assets/character.png");
    var sprite = new PIXI.Sprite (characterTexture);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    this.sprite = sprite;

    var bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_type(Box2D.b2_dynamicBody);
    bodyDef.set_position(new Box2D.b2Vec2(5, 0));
    bodyDef.set_fixedRotation(true);
    this.body = world.CreateBody(bodyDef);
    this.body.userData = this;
    var shapeDef = new Box2D.b2PolygonShape();
    shapeDef.SetAsBox(0.335, 0.825);
    var fixtureDef = new Box2D.b2FixtureDef();
    fixtureDef.set_shape(shapeDef);
    fixtureDef.set_friction(0.3);
    fixtureDef.set_density(1.0);
    this.body.CreateFixture(shapeDef, 1.0);

    this.jumpState = new ReadyToJumpState(this);
  }
  Character.prototype.physics = function(dt) {
    var newState = this.jumpState.physics(dt, this);
    if (newState) {
      this.jumpState = newState;
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
  function StaticObject(world, o) {
    var self = this;
    var texture = PIXI.Texture.fromImage(o.imagePath);
    var sprite = new PIXI.TilingSprite (texture, o.width, o.height);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    self.sprite = sprite;
    self.sprite.position.set(o.x, o.y);

    var bodyDef = new Box2D.b2BodyDef();
    bodyDef.set_position(new Box2D.b2Vec2(o.x / 100, o.y / 100));
    self.body = world.CreateBody(bodyDef);
    self.body.userData = self;
    var shapeDef = new Box2D.b2PolygonShape();
    shapeDef.SetAsBox(o.width / 200, o.height / 200);
    self.body.CreateFixture(shapeDef, 1.0);
  }

  Character.prototype.handleCollision = Match(
    MatchTypes(
      instanceOf(StaticObject),
      function (staticObject) {
        var newState = this.jumpState.onFloor();
        if (newState) {
          this.jumpState = newState;
        }
      }
    )
  );

  StaticObject.prototype.handleCollision = Match(
    MatchTypes(
      instanceOf(Character),
      function (character) {
        character.handleCollision(this);
      }
    )
  );

  return {
    Character: Character,
    StaticObject: StaticObject
  };
});
