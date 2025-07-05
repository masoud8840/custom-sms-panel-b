// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("sms-ir");

// Create a new document in the collection.
db.getCollection("codes").insertOne({
  name: "عضویت",
  code: "40",
  response: "با موفقیت عضو شدید.",
});
