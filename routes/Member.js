const router = require("express").Router();
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/members");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const { updateMembers, abortUpdate } = require("../controllers/Member");

router.post("/update", upload.single("file"), updateMembers);
router.get("/abort", abortUpdate);

module.exports = router;
