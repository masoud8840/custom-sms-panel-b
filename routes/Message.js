const router = require("express").Router();
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/messages");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const { postBulkSend } = require("../controllers/Message");

router.post("/send", upload.single("file"), postBulkSend);

module.exports = router;
