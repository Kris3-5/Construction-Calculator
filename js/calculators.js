/* ============================================================
   Each calculator is one object in this array.
   To add one: copy a block, give it a new id, list its fields,
   write compute(), then add its text keys to js/i18n.js.

   field:  { id, unit, def, min, step }              -> number input
           { id, options:[[value,label]...], def }   -> dropdown
           flag: true                                -> yellow underline (reserve, tolerances)

   compute(v) returns:
           headline : the one number people came for
           rows     : the rest of the material list
           noteKey  : optional caveat shown under the list
   value objects: { key, value, unit, dec, ceil }
   ============================================================ */

var CONCRETE_GRADES = {
  "m150": { cement: 250, sand: 3.0, gravel: 5.0, label: "C12/15 (M150)" },
  "m250": { cement: 300, sand: 2.6, gravel: 4.5, label: "C16/20 (M250)" },
  "m300": { cement: 350, sand: 2.1, gravel: 3.9, label: "C20/25 (M300)" },
  "m400": { cement: 400, sand: 1.7, gravel: 3.2, label: "C25/30 (M400)" }
};

var CALCULATORS = [

  /* -------------------------------------------------- 1. concrete */
  {
    id: "concrete",
    group: "structure",
    fields: [
      { id: "len",   unit: "m",  def: 6,   min: 0, step: 0.01 },
      { id: "wid",   unit: "m",  def: 4,   min: 0, step: 0.01 },
      { id: "thk",   unit: "cm", def: 15,  min: 0, step: 0.5 },
      { id: "count", unit: "pcs", def: 1,  min: 1, step: 1 },
      { id: "grade", def: "m300", options: [
          ["m150", CONCRETE_GRADES.m150.label],
          ["m250", CONCRETE_GRADES.m250.label],
          ["m300", CONCRETE_GRADES.m300.label],
          ["m400", CONCRETE_GRADES.m400.label]
      ] },
      { id: "bag", unit: "kg", def: "25", options: [["25", "25"], ["50", "50"]] },
      { id: "reserve", unit: "pct", def: 5, min: 0, step: 1, flag: true }
    ],
    compute: function (v) {
      var vol = v.len * v.wid * (v.thk / 100) * v.count;
      var total = vol * (1 + v.reserve / 100);
      var mix = CONCRETE_GRADES[v.grade] || CONCRETE_GRADES.m300;

      var cement = total * mix.cement;
      var bagKg = parseFloat(v.bag) || 25;

      return {
        headline: { key: "res.volume", value: total, unit: "m3", dec: 2 },
        rows: [
          { key: "res.cement",     value: cement,                  unit: "kg",   dec: 0 },
          { key: "res.cementBags", value: cement / bagKg,          unit: "bags", dec: 0, ceil: true },
          { key: "res.sand",       value: cement * mix.sand / 1000,   unit: "t",  dec: 2 },
          { key: "res.gravel",     value: cement * mix.gravel / 1000, unit: "t",  dec: 2 },
          { key: "res.water",      value: cement * 0.5,            unit: "l",    dec: 0 }
        ],
        noteKey: "calc.concrete.note"
      };
    }
  },

  /* -------------------------------------------------- 2. block wall */
  {
    id: "blockwall",
    group: "masonry",
    fields: [
      { id: "wallLen",  unit: "m",  def: 8,   min: 0, step: 0.01 },
      { id: "wallH",    unit: "m",  def: 2.7, min: 0, step: 0.01 },
      { id: "openings", unit: "m2", def: 4,   min: 0, step: 0.01 },
      { id: "blockL",   unit: "mm", def: 600, min: 1, step: 5 },
      { id: "blockH",   unit: "mm", def: 250, min: 1, step: 5 },
      { id: "blockW",   unit: "mm", def: 200, min: 1, step: 5 },
      { id: "joint",    unit: "mm", def: 10,  min: 0, step: 1 },
      { id: "reserve",  unit: "pct", def: 5,  min: 0, step: 1, flag: true }
    ],
    compute: function (v) {
      var area = Math.max(0, v.wallLen * v.wallH - v.openings);

      // one block plus its share of joint, in metres
      var stepL = (v.blockL + v.joint) / 1000;
      var stepH = (v.blockH + v.joint) / 1000;
      var perM2 = (stepL > 0 && stepH > 0) ? 1 / (stepL * stepH) : 0;

      var netBlocks = area * perM2;
      var blocks = netBlocks * (1 + v.reserve / 100);

      // mortar = wall volume minus the solid volume of the blocks in it
      var wallVol = area * (v.blockW / 1000);
      var blockVol = netBlocks * (v.blockL * v.blockH * v.blockW) / 1e9;
      var mortar = Math.max(0, wallVol - blockVol) * 1.15; // 15% for spillage

      return {
        headline: { key: "res.blocks", value: blocks, unit: "pcs", dec: 0, ceil: true },
        rows: [
          { key: "res.wallArea",   value: area,          unit: "m2",   dec: 2 },
          { key: "res.perM2",      value: perM2,         unit: "pcs",  dec: 1 },
          { key: "res.mortar",     value: mortar,        unit: "m3",   dec: 2 },
          { key: "res.mortarBags", value: mortar * 1700 / 25, unit: "bags", dec: 0, ceil: true }
        ],
        noteKey: "calc.blockwall.note"
      };
    }
  },

  /* -------------------------------------------------- 3. tiles */
  {
    id: "tile",
    group: "finishing",
    fields: [
      { id: "roomL",   unit: "m",  def: 4,  min: 0, step: 0.01 },
      { id: "roomW",   unit: "m",  def: 3,  min: 0, step: 0.01 },
      { id: "tileL",   unit: "cm", def: 60, min: 1, step: 0.5 },
      { id: "tileW",   unit: "cm", def: 60, min: 1, step: 0.5 },
      { id: "tileT",   unit: "mm", def: 9,  min: 1, step: 0.5 },
      { id: "grout",   unit: "mm", def: 3,  min: 0, step: 0.5 },
      { id: "perBox",  unit: "pcs", def: 4, min: 1, step: 1 },
      { id: "reserve", unit: "pct", def: 10, min: 0, step: 1, flag: true }
    ],
    compute: function (v) {
      var area = v.roomL * v.roomW;

      var tileArea = ((v.tileL / 100) + (v.grout / 1000)) *
                     ((v.tileW / 100) + (v.grout / 1000));
      var tiles = tileArea > 0 ? (area / tileArea) * (1 + v.reserve / 100) : 0;
      var boxes = tiles / (v.perBox || 1);

      // grout kg/m2 = ((A+B)/(A*B)) * jointWidth * tileThickness * 1.6
      var groutKg = (v.tileL > 0 && v.tileW > 0)
        ? ((v.tileL + v.tileW) / (v.tileL * v.tileW)) * v.grout * v.tileT * 1.6 * area
        : 0;

      return {
        headline: { key: "res.tiles", value: tiles, unit: "pcs", dec: 0, ceil: true },
        rows: [
          { key: "res.floorArea", value: area,        unit: "m2", dec: 2 },
          { key: "res.boxes",     value: boxes,       unit: "pcs", dec: 0, ceil: true },
          { key: "res.adhesive",  value: area * 5.6,  unit: "kg", dec: 0 },
          { key: "res.groutMix",  value: groutKg,     unit: "kg", dec: 1 }
        ],
        noteKey: "calc.tile.note"
      };
    }
  },

  /* -------------------------------------------------- 4. screed & plaster */
  {
    id: "screed",
    group: "finishing",
    fields: [
      { id: "len",         unit: "m",    def: 4,   min: 0, step: 0.01 },
      { id: "wid",         unit: "m",    def: 3,   min: 0, step: 0.01 },
      { id: "layer",       unit: "mm",   def: 50,  min: 1, step: 1 },
      { id: "consumption", unit: "kgmm", def: 1.8, min: 0.1, step: 0.1 },
      { id: "bag",         unit: "kg",   def: "25", options: [["25", "25"], ["30", "30"], ["40", "40"]] },
      { id: "reserve",     unit: "pct",  def: 7,   min: 0, step: 1, flag: true }
    ],
    compute: function (v) {
      var area = v.len * v.wid;
      var dryKg = area * v.layer * v.consumption * (1 + v.reserve / 100);
      var bagKg = parseFloat(v.bag) || 25;

      return {
        headline: { key: "res.bags", value: dryKg / bagKg, unit: "bags", dec: 0, ceil: true },
        rows: [
          { key: "res.floorArea", value: area,                          unit: "m2", dec: 2 },
          { key: "res.mixVolume", value: area * (v.layer / 1000),       unit: "m3", dec: 2 },
          { key: "res.dryMix",    value: dryKg,                         unit: "kg", dec: 0 },
          { key: "res.water",     value: dryKg * 0.16,                  unit: "l",  dec: 0 }
        ],
        noteKey: "calc.screed.note"
      };
    }
  },

  /* -------------------------------------------------- 5. paint */
  {
    id: "paint",
    group: "finishing",
    fields: [
      { id: "perimeter", unit: "m",   def: 14,  min: 0, step: 0.01 },
      { id: "wallH",     unit: "m",   def: 2.7, min: 0, step: 0.01 },
      { id: "openings",  unit: "m2",  def: 4,   min: 0, step: 0.01 },
      { id: "coats",     unit: "pcs", def: 2,   min: 1, step: 1 },
      { id: "coverage",  unit: "m2l", def: 10,  min: 1, step: 0.5 },
      { id: "canSize",   unit: "l",   def: "2.5", options: [["1", "1"], ["2.5", "2.5"], ["5", "5"], ["10", "10"]] },
      { id: "reserve",   unit: "pct", def: 10,  min: 0, step: 1, flag: true }
    ],
    compute: function (v) {
      var area = Math.max(0, v.perimeter * v.wallH - v.openings);
      var litres = v.coverage > 0
        ? (area * v.coats / v.coverage) * (1 + v.reserve / 100)
        : 0;
      var can = parseFloat(v.canSize) || 2.5;

      return {
        headline: { key: "res.paint", value: litres, unit: "l", dec: 1 },
        rows: [
          { key: "res.paintArea", value: area,                unit: "m2",  dec: 2 },
          { key: "res.cans",      value: litres / can,        unit: "pcs", dec: 0, ceil: true },
          { key: "res.primer",    value: v.coverage > 0 ? area / v.coverage : 0, unit: "l", dec: 1 }
        ],
        noteKey: "calc.paint.note"
      };
    }
  }

];
