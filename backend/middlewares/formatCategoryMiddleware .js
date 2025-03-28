const formatCategoryMiddleware = (req, res, next) => {
  const { name, categories } = req.body;

  // Skip formatting if the name is "Currency Data"
  if (name === "Currency Data") {
    next();
    return;
  }

  if (name) {
    // Capitalize the first letter of each word in the name
    req.body.name = name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  if (categories) {
    const formattedCategories = {};

    // Format each category key and its values
    for (const [key, values] of Object.entries(categories)) {
      const formattedKey =
        key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();

      formattedCategories[formattedKey] = values.map((value) => {
        if (typeof value === "string") {
          return value
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ");
        }
        return value; // If value is not a string, keep it unchanged
      });
    }

    req.body.categories = formattedCategories;
  }

  next();
};

export default formatCategoryMiddleware;
