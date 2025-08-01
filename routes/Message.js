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

const {
  postBulkSend,
  getAllMessages,
  downloadAllMessages,
  postResetMessages,
} = require("../controllers/Message");

router.post("/send", upload.single("file"), postBulkSend);
router.get("/", getAllMessages);
router.get("/download", downloadAllMessages);
router.post("/reset", postResetMessages);

module.exports = router;
