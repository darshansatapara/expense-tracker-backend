// Connect to the admin database
import currencies from "./currency.js";
import {
  // connectUserDatabase,
  connectAdminDatabase,
} from "../config/database.js";
import {
  AdminCurrencyCategory,
  AdminExpenseCategory,
  AdminIncomeCategory,
  // CopyAdminExpenseCategory,
} from "../models/AdminModel/AdminCategoryModels.js";
import incomeSources from "./income.js";
import mongoose from "mongoose";
import categories from "./category.js";

// **********************************Function to add currencies to the database
const saveCurrency = async (currencyData, CurrencyModel) => {
  try {
    const newCurrency = new CurrencyModel({
      ...currencyData,
      isCurrencyActive: true, // Default to active
    });

    await newCurrency.save();
    console.log(`Added currency: ${currencyData.currency}`);
  } catch (error) {
    console.error(
      `Error adding currency "${currencyData.currency}":`,
      error.message
    );
  }
};

const addCurrencies = async () => {
  try {
    const adminDbConnection = await connectAdminDatabase(); // Ensure this function is defined
    const CurrencyModel = AdminCurrencyCategory(adminDbConnection);

    // Add each currency from the array
    for (const currencyData of currencies) {
      await saveCurrency(currencyData, CurrencyModel);
    }

    console.log("All currencies have been added successfully.");
  } catch (error) {
    console.error("Error adding currencies:", error.message);
  } finally {
    // Disconnect from MongoDB
    mongoose.connection.close();
  }
};

// Run the script
addCurrencies();

// Function to save a income category with its subcategories****************
// Save category with its subcategories
// const saveCategoryWithSubcategories = async (
//   categoryName,
//   subcategories,
//   AdminIncomeCategoryModel
// ) => {
//   try {
//     // Map the subcategory names to objects with _id, name, and isSubCategoryActive
//     const subcategoryObjects = subcategories.map((subcategoryName) => ({
//       _id: new mongoose.Types.ObjectId(),
//       name: subcategoryName,
//       isSubCategoryActive: true, // Default to active
//     }));

//     // Create a new category document
//     const category = new AdminIncomeCategoryModel({
//       name: categoryName,
//       isCategoryActive: true, // Default to active
//       subcategories: subcategoryObjects,
//     });

//     // Save the category to the database
//     await category.save();
//     console.log(
//       `Category "${categoryName}" with ${subcategories.length} subcategories added successfully.`
//     );
//   } catch (error) {
//     console.error(`Error adding category "${categoryName}":`, error.message);
//   }
// };

// // Add income sources to the database
// const addIncomeSources = async () => {
//   try {
//     // Connect to MongoDB
//     const adminDbConnection = await connectAdminDatabase(); // Ensure you have this function defined to establish the connection
//     const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);

//     // Iterate through each category in incomeSources
//     for (const [categoryName, subcategories] of Object.entries(incomeSources)) {
//       await saveCategoryWithSubcategories(
//         categoryName,
//         subcategories,
//         AdminIncomeCategoryModel
//       );
//     }

//     console.log("All income sources added successfully.");
//   } catch (error) {
//     console.error("Error adding income sources:", error.message);
//   } finally {
//     // Disconnect from MongoDB
//     mongoose.connection.close();
//   }
// };

// // Run the script
// addIncomeSources();

// Function to save expense a category and its subcategories***********************************
// Save category with its subcategories
// const saveCategoryWithSubcategories = async (
//   categoryName,
//   subcategories,
//   AdminExpenseCategoryModel
// ) => {
//   try {
//     // Map the subcategories to objects with _id, name, and isSubCategoryActive
//     const subcategoryObjects = subcategories.map((subcategoryName) => ({
//       _id: new mongoose.Types.ObjectId(),
//       name: subcategoryName,
//       isSubCategoryActive: true, // Default to active
//     }));

//     // Create a new category document
//     const category = new AdminExpenseCategoryModel({
//       name: categoryName,
//       isCategoryActive: true, // Default to active
//       subcategories: subcategoryObjects,
//     });

//     // Save to the database
//     await category.save();
//     console.log(
//       `Category "${categoryName}" with subcategories added successfully.`
//     );
//   } catch (error) {
//     console.error(`Error adding category "${categoryName}":`, error.message);
//   }
// };

// // Add categories and subcategories to the database
// const addCategories = async () => {
//   try {
//     // Connect to MongoDB
//     const adminDbConnection = await connectAdminDatabase();
//     console.log("Connected to MongoDB");

//     // Get the AdminExpenseCategory model
//     const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

//     // Iterate through the categories object and add each category
//     for (const [categoryName, subcategories] of Object.entries(categories)) {
//       await saveCategoryWithSubcategories(
//         categoryName,
//         subcategories,
//         AdminExpenseCategoryModel
//       );
//     }

//     console.log("All categories and subcategories added successfully.");
//   } catch (error) {
//     console.error("Error adding categories:", error.message);
//   } finally {
//     // Disconnect from MongoDB
//     mongoose.connection.close();
//   }
// };

// // Run the script
// addCategories();

// *************************************************Copy data function

// make a copy of the data of admin expense categories*****************
// async function copyAdminExpenseCategories() {
//   try {
//     const adminDbConnection = await connectAdminDatabase();
//     console.log("Connected to MongoDB");

//     // Initialize the models
//     const AdminCategory = AdminExpenseCategory(adminDbConnection);
//     const CopyCategory = CopyAdminExpenseCategory(adminDbConnection);

//     // Fetch all documents from the AdminExpenseCategory collection
//     const categories = await AdminCategory.find({});
//     console.log(`Found ${categories.length} categories in AdminExpenseCategory`);

//     // Prepare data for the CopyAdminExpenseCategory collection
//     const copyData = categories.map((category) => {
//       return {
//         name: category.name,
//         categoryId: category._id, // Store the original _id
//         categoryStatus: "active", // Default status for category
//         subcategories: category.subcategories.map((subcategory) => ({
//           _id: subcategory._id,
//           name: subcategory.name,
//           subCategoryStatus: "active", // Default status for subcategory
//         })),
//       };
//     });

//     // Insert the data into the CopyAdminExpenseCategory collection
//     const result = await CopyCategory.insertMany(copyData);
//     console.log(`Copied ${result.length} categories to CopyAdminExpenseCategory`);

//     // Close the database connection
//     await mongoose.connection.close();
//     console.log("Database connection closed");
//   } catch (error) {
//     console.error("Error copying categories:", error);
//     process.exit(1); // Exit with failure
//   }
// }

// // Execute the function
// copyAdminExpenseCategories();

// update the categories with active categories or not active

// Function to update the existing database

// const updateCategories = async () => {
//   try {
//     // Connect to MongoDB
//     const adminDbConnection = await connectAdminDatabase();
//     console.log("Connected to MongoDB");

//     // Get the AdminExpenseCategory model
//     const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

//     // Fetch all categories
//     const categories = await AdminExpenseCategoryModel.find();

//     // Update each category and its subcategories
//     for (const category of categories) {
//       // Ensure isCategoryActive exists
//       if (category.isCategoryActive === undefined) {
//         category.isCategoryActive = true; // Default value
//       }

//       // Check and update subcategories
//       let subcategoriesUpdated = false; // Track if any subcategories were updated
//       category.subcategories = category.subcategories.map((subcategory) => {
//         if (subcategory.isSubCategoryActive === undefined) {
//           subcategoriesUpdated = true;
//           return {
//             ...subcategory.toObject(),
//             isSubCategoryActive: true, // Add the new field
//           };
//         }
//         return subcategory; // Leave as is if already updated
//       });

//       // Save the category only if updates were made
//       if (subcategoriesUpdated || category.isCategoryActive === undefined) {
//         await category.save();
//       }
//     }

//     console.log("Categories updated successfully");
//   } catch (error) {
//     console.error("Error updating categories:", error.message);
//   } finally {
//     // Close the MongoDB connection
//     mongoose.connection.close();
//   }
// };

// // Run the update script
// updateCategories();
