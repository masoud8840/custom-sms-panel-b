const router = require("express").Router();

const {
  getCodes,
  getSingleCodes,
  updateSingleCodes,
  postNewCodes,
  deleteCodes,
} = require("../controllers/Code.js");

router.post("/", postNewCodes);
router.get("/", getCodes);
router.get("/:id", getSingleCodes);
router.put("/:id", updateSingleCodes);
router.delete("/:id", deleteCodes);

module.exports = router;
