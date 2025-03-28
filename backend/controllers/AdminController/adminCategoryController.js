import {
  AdminCurrencyCategory,
  AdminExpenseCategory,
  AdminIncomeCategory,
} from "../../models/AdminModel/AdminCategoryModels.js";
import {
  restoreUserCurrencyByAdminChanged,
  restoreUserExpenseCategoryByAdminChanged,
  softDeleteUserCurrencyByAdminChanged,
  softDeleteUserExpenseCategoryByAdminChanged,
} from "../../middlewares/userMiddlewares/userCategoryMiddlewares.js";
import mongoose from "mongoose";

//********************Expense**************************//
// Get all Admin Expense Categories which is active and inactive both
export const getAllAdminExpenseCategories =
  (adminDbConnection) => async (req, res) => {
    try {
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);
      const categories = await AdminExpenseCategoryModel.find();
      res.status(200).json({ success: true, categories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

// get all Expense Categories which is currently active
export const getAllAdminExpenseCategoriesIsActive =
  (adminDbConnection) => async (req, res) => {
    try {
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

      // Fetch only active categories and filter active subcategories
      const categories = await AdminExpenseCategoryModel.find(
        { isCategoryActive: true } // Fetch only active categories
      ).lean(); // Use lean() for better performance and direct object manipulation

      const filteredCategories = categories.map((category) => ({
        ...category,
        subcategories: category.subcategories.filter(
          (subcategory) => subcategory.isSubCategoryActive // Include only active subcategories
        ),
      }));

      res.status(200).json({ success: true, categories: filteredCategories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

// update category & subcategories name , we able to update one or more categories at a time
export const updateExpenseCategoriesAndSubcategories =
  (adminDbConnection) => async (req, res) => {
    const updatedcategories = req.body.updatedcategories; // Expect an array of update objects

    if (!Array.isArray(updatedcategories) || updatedcategories.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No updates provided." });
    }

    const notFoundItems = [];
    const successfulUpdates = [];

    try {
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

      // Process all updates
      for (const update of updatedcategories) {
        const { categoryId, categoryNewName, subcategories } = update;

        if (!categoryId) {
          notFoundItems.push({ categoryId, message: "Missing category ID" });
          continue;
        }

        const category = await AdminExpenseCategoryModel.findById(categoryId);
        if (!category) {
          notFoundItems.push({ categoryId, message: "Category not found" });
          continue;
        }

        if (categoryId && categoryNewName && !subcategories) {
          // Case 1: Update only category name
          category.name = categoryNewName;
          await category.save();
          successfulUpdates.push({
            categoryId,
            categoryNewName,
            message: "Category name updated successfully",
          });
        } else if (
          categoryId &&
          !categoryNewName &&
          Array.isArray(subcategories)
        ) {
          // Case 3: Update only subcategories
          for (const subcategoryUpdate of subcategories) {
            const { subcategoryId, subCategorynewName } = subcategoryUpdate;

            if (!subcategoryId || !subCategorynewName) {
              notFoundItems.push({
                categoryId,
                subcategoryId,
                message: "Missing subcategory ID or new name",
              });
              continue;
            }

            const subcategory = category.subcategories.id(subcategoryId);
            if (subcategory) {
              subcategory.name = subCategorynewName;
              successfulUpdates.push({
                categoryId,
                subcategoryId,
                subCategorynewName,
                message: "Subcategory updated successfully",
              });
            } else {
              notFoundItems.push({
                categoryId,
                subcategoryId,
                message: "Subcategory not found",
              });
            }
          }

          await category.save();
        } else if (
          categoryId &&
          categoryNewName &&
          Array.isArray(subcategories)
        ) {
          // Case 2: Update both category name and subcategories
          category.name = categoryNewName;

          for (const subcategoryUpdate of subcategories) {
            const { subcategoryId, subCategorynewName } = subcategoryUpdate;

            if (!subcategoryId || !subCategorynewName) {
              notFoundItems.push({
                categoryId,
                subcategoryId,
                message: "Missing subcategory ID or new name",
              });
              continue;
            }

            const subcategory = category.subcategories.id(subcategoryId);
            if (subcategory) {
              subcategory.name = subCategorynewName;
              successfulUpdates.push({
                categoryId,
                categoryNewName,
                subcategoryId,
                subCategorynewName,
              });
            } else {
              notFoundItems.push({
                categoryId,
                subcategoryId,
                message: "Subcategory not found",
              });
            }
          }

          await category.save();
          successfulUpdates.push({
            categoryId,
            categoryNewName,
            message: "Category name and subcategories updated successfully",
          });
        } else {
          // Case 4: Invalid or incomplete input
          notFoundItems.push({
            categoryId,
            message:
              "Invalid update request. Provide valid category or subcategory data.",
          });
        }
      }

      // Respond with the results after processing all updates
      res.status(200).json({
        success: true,
        message: "Updates processed successfully.",
        successfulUpdates,
        notFoundItems,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

// soft delete of only expense "categories" in the admin and user expense data
/*{
  "categoryIds": ["64e8b25f1234567890abcdef", "64e8b2601234567890abcdef"]
}
 */
export const softDeleteExpenseCategories =
  (adminDbConnection, userDbConnection) => async (req, res) => {
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one categoryId to soft delete.",
      });
    }

    try {
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

      // Soft delete categories and their subcategories in admin data
      await AdminExpenseCategoryModel.updateMany(
        { _id: { $in: categoryIds } },
        {
          $set: {
            isCategoryActive: false,
            "subcategories.$[].isSubCategoryActive": false, // Deactivate all subcategories
          },
        }
      );

      // Step 2: Update user data using middleware
      const handleMiddlewareResponse = async () => {
        return new Promise((resolve, reject) => {
          softDeleteUserExpenseCategoryByAdminChanged(
            adminDbConnection,
            userDbConnection
          )(
            req, // Pass the request object to middleware
            res, // Pass the response object to middleware
            categoryIds,
            null, // No subcategory-specific data needed here
            (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            }
          );
        });
      };

      await handleMiddlewareResponse();

      // Step 3: Send success response after both updates
      res.status(200).json({
        success: true,
        message:
          "Categories and their subcategories soft deleted successfully in both admin and user data.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to soft delete categories.",
        error: error.message,
      });
    }
  };

// soft delete of only expense "Sub-categories" in the admin and user expense data
/*
{
  "softdeletedata": [
    {
      "categoryIds": "64e8b25f1234567890abcdef",
      "subcategoriesId": ["64e8b25f1234567890abc001", "64e8b25f1234567890abc002"]
    },
    {
      "categoryIds": "64e8b2601234567890abcdef",
      "subcategoriesId": ["64e8b2601234567890abc003", "64e8b2601234567890abc004"]
    }
  ]
}

*/
export const softDeleteExpenseSubcategories =
  (adminDbConnection, userDbConnection) => async (req, res) => {
    const { softdeletedata } = req.body;

    if (!softdeletedata || !Array.isArray(softdeletedata)) {
      return res.status(400).json({
        success: false,
        message: "Invalid input. 'softdeletedata' must be a valid array.",
      });
    }

    const alreadyDeletedSubcategories = [];
    const changedSubcategories = [];

    try {
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

      // Step 1: Soft delete subcategories in admin data
      for (const { categoryIds, subcategoriesId } of softdeletedata) {
        const adminCategory = await AdminExpenseCategoryModel.findOne({
          _id: categoryIds,
          "subcategories._id": { $in: subcategoriesId },
        });

        if (!adminCategory) {
          continue; // Skip if category doesn't exist
        }

        for (const subcategoryId of subcategoriesId) {
          const subcategory = adminCategory.subcategories.find(
            (sub) => sub._id.toString() === subcategoryId
          );

          if (!subcategory) {
            continue; // Skip if subcategory doesn't exist
          }

          if (subcategory.isSubCategoryActive === false) {
            // Already soft deleted, add to `alreadyDeletedSubcategories`
            alreadyDeletedSubcategories.push(subcategoryId);
          } else {
            // Soft delete and add to `changedSubcategories`
            await AdminExpenseCategoryModel.updateOne(
              { _id: categoryIds },
              {
                $set: {
                  "subcategories.$[subcategory].isSubCategoryActive": false,
                },
              },
              {
                arrayFilters: [{ "subcategory._id": subcategoryId }],
              }
            );

            changedSubcategories.push(subcategoryId);
          }
        }
      }

      // Step 2: Update user data using middleware
      const handleMiddlewareResponse = async () => {
        return new Promise((resolve, reject) => {
          softDeleteUserExpenseCategoryByAdminChanged(
            adminDbConnection,
            userDbConnection
          )(
            req, // Pass the request object to middleware
            res, // Pass the response object to middleware
            softdeletedata,
            (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            }
          );
        });
      };

      await handleMiddlewareResponse();

      // Step 3: Send success response after both updates
      return res.status(200).json({
        success: true,
        message:
          "Subcategories soft deleted successfully in both admin and user data.",
        alreadyDeletedSubcategories,
        changedSubcategories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to soft delete subcategories.",
        error: error.message,
      });
    }
  };

// restore soft delete(mean make active : true) only in expense "category" in admin and user database
/*{
  "categoryIds": ["64e8b25f1234567890abcdef", "64e8b2601234567890abcdef"]
}
 */
export const restoreExpenseCategories =
  (adminDbConnection, userDbConnection) => async (req, res) => {
    const { categoryIds } = req.body;

    // Validate that categoryIds is an array and has at least one element
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one categoryId to restore.",
      });
    }

    try {
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);
      // const UserExpenseCategory = UserExpenseCategoryModel(userDbConnection);

      // Restore categories and their subcategories in admin data
      const adminCategories = await AdminExpenseCategoryModel.find({
        _id: { $in: categoryIds },
      }).select("_id subcategories");

      const adminChanges = {
        updatedCategories: [],
        updatedSubcategories: [],
        alreadyRestoredCategories: [],
        alreadyRestoredSubcategories: [],
      };

      // For each category in the provided categoryIds
      for (const adminCategory of adminCategories) {
        const categoryWasRestored = adminCategory.isCategoryActive;

        // If the category is not active, restore it
        if (!categoryWasRestored) {
          await AdminExpenseCategoryModel.updateOne(
            { _id: adminCategory._id },
            { $set: { isCategoryActive: true } }
          );
          adminChanges.updatedCategories.push(adminCategory._id);
        } else {
          adminChanges.alreadyRestoredCategories.push(adminCategory._id);
        }

        // Now restore all subcategories under the restored category
        for (const subcategory of adminCategory.subcategories) {
          if (!subcategory.isSubCategoryActive) {
            await AdminExpenseCategoryModel.updateOne(
              { _id: adminCategory._id },
              {
                $set: {
                  "subcategories.$[subcategory].isSubCategoryActive": true,
                },
              },
              {
                arrayFilters: [{ "subcategory._id": subcategory._id }],
              }
            );
            adminChanges.updatedSubcategories.push(subcategory._id);
          } else {
            adminChanges.alreadyRestoredSubcategories.push(subcategory._id);
          }
        }
      }

      // Update user data using middleware
      // Get user changes from middleware
      const userChangesResponse =
        await restoreUserExpenseCategoryByAdminChanged(
          adminDbConnection,
          userDbConnection
        )(req, res, categoryIds, null); // Pass request, response, and restore data

      // Send success response with admin and user changes
      res.status(200).json({
        success: true,
        message:
          "Subcategories restored successfully in both admin and user data.",
        adminChanges,
        userChanges: userChangesResponse, // Send user changes from middleware
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to restore categories.",
        error: error.message,
      });
    }
  };

// restore soft delete(mean make active : true) only in expense "sub-category" in admin and user database
/*
{
  "restoreData": [
    {
      "categoryIds": "64e8b25f1234567890abcdef",
      "subcategoriesId": ["64e8b25f1234567890abc001", "64e8b25f1234567890abc002"]
    },
    {
      "categoryIds": "64e8b2601234567890abcdef",
      "subcategoriesId": ["64e8b2601234567890abc003", "64e8b2601234567890abc004"]
    }
  ]
}

*/
export const restoreExpenseSubcategories =
  (adminDbConnection, userDbConnection) => async (req, res) => {
    const { restoredata } = req.body;

    if (!restoredata || !Array.isArray(restoredata)) {
      return res.status(400).json({
        success: false,
        message: "Invalid input. 'restoredata' must be a valid array.",
      });
    }

    try {
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

      const adminChanges = {
        updatedCategories: [],
        updatedSubcategories: [],
        alreadyRestoredCategories: [],
        alreadyRestoredSubcategories: [],
      };

      // const userChanges = {
      //   updatedCategories: [],
      //   updatedSubcategories: [],
      //   alreadyRestoredCategories: [],
      //   alreadyRestoredSubcategories: [],
      // };

      // Process admin categories and subcategories
      for (const { categoryIds, subcategoriesId } of restoredata) {
        const adminCategory = await AdminExpenseCategoryModel.findOne({
          _id: categoryIds,
        });

        if (!adminCategory) {
          continue;
        }

        const categoryWasRestored = adminCategory.isCategoryActive;

        // Restore the category if soft-deleted
        if (!categoryWasRestored) {
          await AdminExpenseCategoryModel.updateOne(
            { _id: categoryIds },
            { $set: { isCategoryActive: true } }
          );
          adminChanges.updatedCategories.push(categoryIds);
        } else {
          adminChanges.alreadyRestoredCategories.push(categoryIds);
        }

        // Restore subcategories
        for (const subcategoryId of subcategoriesId) {
          const subcategory = adminCategory.subcategories.find(
            (sub) => sub._id.toString() === subcategoryId.toString()
          );

          if (subcategory && !subcategory.isSubCategoryActive) {
            await AdminExpenseCategoryModel.updateOne(
              { _id: categoryIds },
              {
                $set: {
                  "subcategories.$[subcategory].isSubCategoryActive": true,
                },
              },
              {
                arrayFilters: [{ "subcategory._id": subcategoryId }],
              }
            );
            adminChanges.updatedSubcategories.push(subcategoryId);
          } else if (subcategory) {
            adminChanges.alreadyRestoredSubcategories.push(subcategoryId);
          }
        }
      }

      // Get user changes from middleware
      const userChangesResponse =
        await restoreUserExpenseCategoryByAdminChanged(
          adminDbConnection,
          userDbConnection
        )(req, res, null, restoredata); // Pass request, response, and restore data

      // Send success response with admin and user changes
      res.status(200).json({
        success: true,
        message:
          "Subcategories restored successfully in both admin and user data.",
        adminChanges,
        userChanges: userChangesResponse, // Send user changes from middleware
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to restore subcategories.",
        error: error.message,
      });
    }
  };

//********************Income**************************//
// Get all Admin Income Categories
export const getAllAdminIncomeCategories =
  (adminDbConnection) => async (req, res) => {
    try {
      const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);
      const categories = await AdminIncomeCategoryModel.find();
      res.status(200).json({ success: true, categories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

// get income categories which are active
export const getAllAdminIncomeCategoriesIsActive =
  (adminDbConnection) => async (req, res) => {
    try {
      const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);

      // Fetch only active income categories
      const categories = await AdminIncomeCategoryModel.find(
        { isCategoryActive: true } // Fetch only active categories
      ).lean();

      const filteredCategories = categories.map((category) => ({
        ...category,
        subcategories: category.subcategories.filter(
          (subcategory) => subcategory.isSubCategoryActive // Include only active subcategories
        ),
      }));

      res.status(200).json({ success: true, categories: filteredCategories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

// get all profession which are active
export const getAllAdminProfessionIsActive =
  (adminDbConnection) => async (req, res) => {
    try {
      const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);
      const categories = await AdminIncomeCategoryModel.find(
        { isCategoryActive: true }, // Fetch only active categories
        { name: 1, _id: 1 } // Project only name, _id, and subcategories
      ).lean();

      const filteredCategories = categories.map((category) => ({
        _id: category._id,
        name: category.name,
      }));

      res.status(200).json({ success: true, profession: filteredCategories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

//********************currency**************************//
// Get all Admin Currency Categories
export const getAllAdminCurrencyCategories =
  (adminDbConnection) => async (req, res) => {
    try {
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);
      const categories = await AdminCurrencyCategoryModel.find();
      res.status(200).json({ success: true, categories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

// get currency category which is active
export const getAllAdminCurrencyCategoriesIsActive =
  (adminDbConnection) => async (req, res) => {
    try {
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);

      // Fetch only active currencies
      const currencies = await AdminCurrencyCategoryModel.find(
        { isCurrencyActive: true } // Fetch only active currencies
      ).lean();

      res.status(200).json({ success: true, currencies });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

// we can use soft delete here which is make the currency category isCurrencyActive:false, also form the user currency category database collection
/*{
  "categoryIds": [
    "6774e15f0ae028dfbf4f2c67",
    "6774e1600ae028dfbf4f2c6c"
  ]
}*/
export const softDeleteAdminCurrencyCategories =
  (adminDbConnection, userDbConnection) => async (req, res) => {
    const { categoryIds } = req.body; // Expect an array of category IDs to deactivate

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid array of currency category IDs.",
      });
    }

    try {
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);
      // const UserCurrencyAndBudget =
      //   UserCurrencyAndBudgetModel(userDbConnection);

      // Update all provided categories in AdminCurrencyCategory
      const updatedCategories = await AdminCurrencyCategoryModel.updateMany(
        { _id: { $in: categoryIds } },
        { $set: { isCurrencyActive: false } }
      );

      if (updatedCategories.modifiedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "No matching currency categories found to deactivate.",
        });
      }

      // Trigger user currency updates asynchronously for affected categories
      softDeleteUserCurrencyByAdminChanged(adminDbConnection, userDbConnection)(
        () => {},
        categoryIds
      );

      res.status(200).json({
        success: true,
        message: "Currency categories deactivated successfully.",
        data: { deactivatedCategoryIds: categoryIds },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to deactivate currency categories.",
        error: error.message,
      });
    }
  };

// restore the currency categories which is softdeleted
/*{
  "categoryIds": [
    "6774e15f0ae028dfbf4f2c67",
    "6774e1600ae028dfbf4f2c6c"
  ]
}

*/
export const restoreCurrencyCategories =
  (adminDbConnection, userDbConnection) => async (req, res) => {
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid array of currency category IDs.",
      });
    }

    const validCategoryIds = categoryIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validCategoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid currency category IDs provided.",
      });
    }

    try {
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);

      // Restore admin categories
      const adminUpdates = {
        restoredCategories: [],
        alreadyRestoredCategories: [],
      };

      const adminCategories = await AdminCurrencyCategoryModel.find({
        _id: { $in: validCategoryIds },
      });

      for (const category of adminCategories) {
        if (category.isCurrencyActive) {
          adminUpdates.alreadyRestoredCategories.push(category._id);
        } else {
          category.isCurrencyActive = true;
          await category.save();
          adminUpdates.restoredCategories.push(category._id);
        }
      }

      if (
        adminUpdates.restoredCategories.length === 0 &&
        adminUpdates.alreadyRestoredCategories.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message: "No matching currency categories found to restore.",
        });
      }

      // Restore user changes
      const userChangesResponse = await restoreUserCurrencyByAdminChanged(
        adminDbConnection,
        userDbConnection
      )(adminUpdates.restoredCategories);

      // Final response
      res.status(200).json({
        success: true,
        message: "Currency categories restored successfully.",
        data: {
          adminChanges: adminUpdates,
          userChanges: {
            restoredCategories: userChangesResponse.restoredCategories,
            alreadyRestoredCategories:
              userChangesResponse.alreadyRestoredCategories,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to restore currency categories.",
        error: error.message,
      });
    }
  };
