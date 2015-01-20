define(['text!levels/level1.json','text!levels/level2.json','text!levels/level3.json'],
  function(level1, level2, level3) {
    return [JSON.parse(level1), JSON.parse(level2), JSON.parse(level3)];
  });
