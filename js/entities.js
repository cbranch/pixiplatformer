define(['pixi','box2d','multipledispatch'],
       function(PIXI, Box2D, MultipleDispatch) {
  var instanceOf = MultipleDispatch.instanceOf;
  var Match = MultipleDispatch.Match;
  var MatchTypes = MultipleDispatch.MatchTypes;

  // from embox2d-helpers.js
  function createPolygonShape(vertices) {
    var shape = new Box2D.b2PolygonShape();
    var buffer = Box2D.allocate(vertices.length * 8, 'float', Box2D.ALLOC_STACK);
    var offset = 0;
    for (var i=0;i<vertices.length;i++) {
        Box2D.setValue(buffer+(offset), vertices[i].get_x(), 'float'); // x
        Box2D.setValue(buffer+(offset+4), vertices[i].get_y(), 'float'); // y
        offset += 8;
    }
    var ptr_wrapped = Box2D.wrapPointer(buffer, Box2D.b2Vec2);
    shape.Set(ptr_wrapped, vertices.length);
    return shape;
  }

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

  function Character(world, opts, maxCollectables) {
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
    this.body.SetSleepingAllowed(false);
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
    this.maxCollectables = maxCollectables;
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
  Character.prototype.animate = function() {
    var pos = this.body.GetPosition();
    this.sprite.position.set(Math.round(pos.get_x() * 100), Math.round(pos.get_y() * 100));
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
  Character.prototype.hasEnoughCollectables = function() {
    return this.collectables >= this.maxCollectables;
  };

  function StaticObject(world, o) {
    var sprite = new PIXI.TilingSprite(PIXI.Texture.fromFrame(o.texture), o.width, o.height);
    sprite.anchor.x = o.anchor.x;
    sprite.anchor.y = o.anchor.y;
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

  function getVerticesFromConfig(o) {
    if ('vertices' in o) {
      var verts = [];
      for (var i = 0; i < o.vertices.length; i++) {
        verts.push(new Box2D.b2Vec2(o.vertices[i].x / 100, o.vertices[i].y / 100));
      }
      return verts;
    } else {
      var w = o.width / 100;
      var h = o.height / 100;
      return [new Box2D.b2Vec2 (0, 0),
        new Box2D.b2Vec2(w, 0),
        new Box2D.b2Vec2(w, h),
        new Box2D.b2Vec2(0, h)];
    }
  }

  function StaticObstacle(world, o) {
    StaticObject.call(this, world, o);

    this.body = initializeBody(this, world, o);
    var shapeDef = createPolygonShape(getVerticesFromConfig(o));
    this.body.CreateFixture(shapeDef, 1.0);
  }
  StaticObstacle.prototype = Object.create (StaticObject.prototype);
  StaticObstacle.prototype.constructor = StaticObstacle;

  function extrudeVerts(v1, v4, extrusionLength) {
    var v1x = v1.get_x();
    var v1y = v1.get_y();
    var v4x = v4.get_x();
    var v4y = v4.get_y();
    var vectorX = v4x - v1x;
    var vectorY = v4y - v1y;
    var vectorLength = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
    var vectorNX = vectorX / vectorLength;
    var vectorNY = vectorY / vectorLength;
    var vectorPX = -vectorNY * -extrusionLength;
    var vectorPY = vectorNX * -extrusionLength;
    return [new Box2D.b2Vec2(v1x, v1y),
      new Box2D.b2Vec2(v1x + vectorPX, v1y + vectorPY),
      new Box2D.b2Vec2(v4x + vectorPX, v4y + vectorPY),
      new Box2D.b2Vec2(v4x, v4y)];
  }

  function StaticPlatform(world, o) {
    StaticObject.call(this, world, o);

    this.body = initializeBody(this, world, o);
    var verts = getVerticesFromConfig(o);
    var shapeDef = createPolygonShape(verts);
    this.body.CreateFixture(shapeDef, 1.0);
    var sensorFixtureDef = new Box2D.b2FixtureDef();
    var sensorVerts = extrudeVerts(verts[0], verts[1], 0.2);
    sensorFixtureDef.set_shape(createPolygonShape(sensorVerts));
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
    this.collected = false;

    var self = this;
    self.animate = function (dt, currentTime, levelState) {
      if (self.collected) {
        self.body.GetWorld().DestroyBody(self.body);
        self.body = undefined;
        self.sprite.parent.removeChild(self.sprite);
        self.sprite = undefined;
        levelState.removeAnimatableObject(self);
      }
    };
  }
  Collectable.prototype = Object.create (StaticObject.prototype);
  Collectable.prototype.constructor = StaticObstacle;

  SilhouetteFilter = function()
  {
      PIXI.AbstractFilter.call( this );

      this.passes = [this];

      // set the uniforms
      this.uniforms = {
          gray: {type: '1f', value: 1}
      };

      this.fragmentSrc = [
          'precision mediump float;',
          'varying vec2 vTextureCoord;',
          'varying vec4 vColor;',
          'uniform sampler2D uSampler;',
          'uniform float gray;',

          'void main(void) {',
          '   gl_FragColor = texture2D(uSampler, vTextureCoord);',
          '   gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0,0.0,0.0), gray);',
          '}'
      ];
  };

  SilhouetteFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
  SilhouetteFilter.prototype.constructor = SilhouetteFilter;

  /**
  * The strength of the gray. 1 will make the object black, 0 will make the object its normal color.
  * @property gray
  * @type Number
  */
  Object.defineProperty(SilhouetteFilter.prototype, 'gray', {
      get: function() {
          return this.uniforms.gray.value;
      },
      set: function(value) {
          this.uniforms.gray.value = value;
      }
  });

  function Princess(world, o) {
    var sprite = new PIXI.Sprite.fromFrame(o.texture);
    sprite.anchor.x = o.anchor.x;
    sprite.anchor.y = o.anchor.y;
    this.sprite = sprite;
    this.sprite.position.set(o.x, o.y);
    this.sprite.shader = new SilhouetteFilter();
    this.x = o.x;
    this.y = o.y;
    this.width = o.width;
    this.height = o.height;

    this.body = initializeBody(this, world, o);
    var sensorDef = new Box2D.b2PolygonShape();
    var sensorCentre = new Box2D.b2Vec2(o.width / 50 * (0.5 - o.anchor.x),
                                        o.height / 50 * (0.5 - o.anchor.y));
    sensorDef.SetAsBox(o.width / 100, o.height / 100, sensorCentre, 0.0);
    var sensorFixtureDef = new Box2D.b2FixtureDef();
    sensorFixtureDef.set_shape(sensorDef);
    sensorFixtureDef.set_isSensor(true);
    this.sensorFixture = this.body.CreateFixture(sensorFixtureDef);
    this.locked = true;

    this.lockSprites = [[], [], []];
    for (var j = 0; j < 3; j++) {
      for (var i = 0; i < 10; i++) {
        var lockSprite = new PIXI.Sprite.fromFrame(o.lockTexture);
        lockSprite.anchor.x = 0.5;
        lockSprite.anchor.y = 0.5;
        lockSprite.position.set(Math.cos(Math.PI * (i / 10)) * this.width * 0.7 + this.x,
          this.y - (this.height / 3) * j - (this.height / 6));
        lockSprite.blendMode = PIXI.blendModes.ADD;
        this.lockSprites[j].push(lockSprite);
      }
    }

    var self = this;
    self.animate = function (dt, currentTime) {
      if (!('lockedAnimTime' in self)) {
        self.lockedAnimTime = currentTime;
      }
      var lockedTimeElapsed = currentTime - self.lockedAnimTime;
      var calculateCirclePos = function (i) { return ((i / 10) + (lockedTimeElapsed / 2000)) % 1; };
      var lockedAnimation = function () {
        for (var i = 0; i < 10; i++) {
          var circPos = calculateCirclePos(i);
          for (var j = 0; j < 3; j++) {
            var lockSprite = self.lockSprites[j][i];
            lockSprite.position.set(Math.cos(Math.PI * circPos) * self.width * 0.7 + self.x,
              self.y - (self.height / 3) * j - (self.height / 6));
          }
        }
      };
      var unlockedAnimation = function () {
        if (!('unlockedAnimTime' in self)) {
          self.unlockedAnimTime = currentTime;
        }
        var unlockedTimeElapsed = currentTime - self.unlockedAnimTime;
        var silhouetteValue = (2000 - unlockedTimeElapsed) / 1000;
        if (silhouetteValue <= 1) {
          if (silhouetteValue <= 0) {
            silhouetteValue = 0;
          }
          self.sprite.shader.gray = silhouetteValue;
        }
        var lockedTimeElapsed = currentTime - self.lockedAnimTime;
        for (var i = 0; i < 10; i++) {
          var circPos = calculateCirclePos(i);
          for (var j = 0; j < 3; j++) {
            var yDisplacement = (unlockedTimeElapsed / 300) - (2 - j);
            if (yDisplacement < 0) yDisplacement = 0;
            yDisplacement = Math.pow(4, yDisplacement);
            var lockSprite = self.lockSprites[j][i];
            lockSprite.position.set(Math.cos(Math.PI * circPos) * self.width * 0.7 + self.x,
              self.y - (self.height / 3) * j - (self.height / 6) - yDisplacement);
          }
        }
      };
      if (self.locked) {
        lockedAnimation();
      } else {
        unlockedAnimation();
      }
    };
  }
  Princess.prototype = Object.create (StaticObject.prototype);
  Princess.prototype.constructor = StaticObstacle;
  Princess.prototype.unlock = function () {
    this.locked = false;
  };

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
        if (platform.supportPlayer !== true) {
          contact.disableThisStep = true;
          return;
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

  function characterCollectableCollision(character, collectable, contact) {
    if (!collectable.collected) {
      collectable.collected = true;
      character.collectables++;
    }
  }

  function characterPrincessCollision(character, princess, contact) {
    if (princess.locked && character.hasEnoughCollectables()) {
      princess.unlock();
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
    ),
    MatchTypes(
      instanceOf(Character), instanceOf(Collectable), instanceOf(Box2D.b2Contact),
      characterCollectableCollision
    ),
    MatchTypes(
      instanceOf(Collectable), instanceOf(Character), instanceOf(Box2D.b2Contact),
      function (a, b, contact) { characterCollectableCollision(b, a, contact); }
    ),
    MatchTypes(
      instanceOf(Character), instanceOf(Princess), instanceOf(Box2D.b2Contact),
      characterPrincessCollision
    ),
    MatchTypes(
      instanceOf(Princess), instanceOf(Character), instanceOf(Box2D.b2Contact),
      function (a, b, contact) { characterPrincessCollision(b, a, contact); }
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
    Princess: Princess,
    WorldEdge: WorldEdge,
    handleCollision: handleCollision,
    handleCollisionContinuous: handleCollisionContinuous,
    handleCollisionEnd: handleCollisionEnd
  };
});
