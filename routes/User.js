const router = require("express").Router();

const {
  postLogin,
  postSignup,
  getValidate,
  getUsers,
  getVerifyUser,
  deleteUser,
} = require("../controllers/User");

router.get("/", getUsers);

router.post("/login", postLogin);
router.post("/signup", postSignup);
router.get("/validate", getValidate);
router.get("/:id", getVerifyUser);
router.delete("/:id", deleteUser);
module.exports = router;
