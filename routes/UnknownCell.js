const router = require("express").Router();
const {
  getUnknownCells,
  downloadUnknownCells,
} = require("../controllers/UnknownCell");

router.get("/", getUnknownCells);
router.get("/download", downloadUnknownCells);
module.exports = router;
