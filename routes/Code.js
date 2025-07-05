const router = require("express").Router();

const {
  getCodes,
  getSingleCodes,
  updateSingleCodes,
  postNewCodes,
} = require("../controllers/Code.js");

router.post("/", postNewCodes);
router.get("/", getCodes);
router.get("/:id", getSingleCodes);
router.put("/:id", updateSingleCodes);

module.exports = router;
