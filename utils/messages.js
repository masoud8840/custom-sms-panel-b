module.exports.replaceTextWithUserFields = (user, text) => {
  let responseText = new String(text);

  const regex = /\{\{(.*?)\}\}/g;

  const matches = text.match(regex);
  if (matches)
    matches.map((m, j) => {
      const propertyName = m.slice(2, -2);
      responseText = responseText.replace(m, user[propertyName]);
    });

  return { responseText, cellphone: user.cellphone };
};
