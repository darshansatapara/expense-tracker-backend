import {
  AdminCurrencyCategory,
  AdminExpenseCategory,
} from "../../models/AdminModel/AdminCategoryModels.js";
import {
  UserCurrencyAndBudgetModel,
  UserExpenseCategoryModel,
} from "../../models/UserModel/UserCategoryModels.js";

// Middleware for soft delete UserCurrencyCategory after soft delete in admin currency category
export const softDeleteUserCurrencyByAdminChanged =
  (adminDbConnection, userDbConnection) => async (next, categoryIds) => {
    try {
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);
      const UserCurrencyAndBudget =
        UserCurrencyAndBudgetModel(userDbConnection);

      // Verify the provided category IDs
      const adminCategories = await AdminCurrencyCategoryModel.find({
        _id: { $in: categoryIds },
        isCurrencyActive: false, // Ensure these are already deactivated
      });

      if (!adminCategories || adminCategories.length === 0) {
        console.log("No matching categories found for user currency updates.");
        return next();
      }

      // Update all users' currency data where the categories match the deactivated IDs
      await UserCurrencyAndBudget.updateMany(
        { "currencyCategory.currencyId": { $in: categoryIds } },
        { $set: { "currencyCategory.$[elem].isCurrencyActive": false } },
        {
          arrayFilters: [{ "elem.currencyId": { $in: categoryIds } }],
        }
      );

      // Send success response
      return res.status(200).json({
        success: true,
        message: `User currency data updated for deactivated categories: ${categoryIds.join(
          ", "
        )}.`,
      });
      // console.log(
      //   `User currencies updated for deactivated categories: ${categoryIds}`
      // );
    } catch (error) {
      console.error(
        "Error updating user currencies for multiple categories:",
        error.message
      );
    }

    next(); // Proceed to the next middleware or operation
  };

// Middleware for Restore softdelete UserCurrencyCategory after Restore softdelete in admin currency category
export const restoreUserCurrencyByAdminChanged =
  (adminDbConnection, userDbConnection) => async (categoryIds) => {
    try {
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);
      const UserCurrencyAndBudget =
        UserCurrencyAndBudgetModel(userDbConnection);

      // Using Sets to ensure unique values
      const restoredCategoriesSet = new Set();
      const alreadyRestoredCategoriesSet = new Set();

      // Fetch the admin categories that are active
      const adminCategories = await AdminCurrencyCategoryModel.find({
        _id: { $in: categoryIds },
        isCurrencyActive: true,
      });

      if (!adminCategories || adminCategories.length === 0) {
        console.log("No matching categories found for user currency updates.");
        return {
          restoredCategories: [],
          alreadyRestoredCategories: [],
        };
      }

      for (const category of adminCategories) {
        // Find user records with the given category ID
        const userCurrencies = await UserCurrencyAndBudget.find({
          "currencyCategory.currencyId": category._id,
        });

        for (const userCurrency of userCurrencies) {
          const currencyEntry = userCurrency.currencyCategory.find(
            (entry) => entry.currencyId.toString() === category._id.toString()
          );

          if (currencyEntry) {
            if (currencyEntry.isCurrencyActive) {
              // Add to already restored set
              alreadyRestoredCategoriesSet.add(category._id.toString());
            } else {
              // Restore the user currency
              await UserCurrencyAndBudget.updateOne(
                {
                  _id: userCurrency._id,
                  "currencyCategory.currencyId": category._id,
                },
                { $set: { "currencyCategory.$.isCurrencyActive": true } }
              );
              restoredCategoriesSet.add(category._id.toString());
            }
          }
        }
      }

      // Convert sets back to arrays
      return {
        restoredCategories: Array.from(restoredCategoriesSet),
        alreadyRestoredCategories: Array.from(alreadyRestoredCategoriesSet),
      };
    } catch (error) {
      console.error(
        "Error restoring user currencies for multiple categories:",
        error.message
      );
      throw new Error("Failed to restore user currencies.");
    }
  };

// Middleware for soft delete UserExpenseCategory and subcategory after soft delete in admin expense category
export const softDeleteUserExpenseCategoryByAdminChanged =
  (adminDbConnection, userDbConnection) =>
  async (req, res, categoryIds, softdeletedata, next) => {
    const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);
    const UserExpenseCategory = UserExpenseCategoryModel(userDbConnection);

    try {
      // Case 1: Handle category soft delete
      if (categoryIds && Array.isArray(categoryIds)) {
        // Fetch categories and their subcategories from the admin database
        const adminCategories = await AdminExpenseCategoryModel.find({
          _id: { $in: categoryIds },
        }).select("_id subcategories");

        for (const category of adminCategories) {
          // Soft delete category in user database
          await UserExpenseCategory.updateMany(
            { "expenseCategories.categoryId": category._id },
            {
              $set: {
                "expenseCategories.$[category].isCategoryActive": false,
                "expenseCategories.$[category].subcategoryIds.$[].isSubcategoryActive": false,
              },
            },
            {
              arrayFilters: [{ "category.categoryId": category._id }],
            }
          );
        }
      }

      // Case 2: Handle subcategory soft delete
      if (softdeletedata && Array.isArray(softdeletedata)) {
        for (const { categoryIds: catId, subcategoriesId } of softdeletedata) {
          // Fetch the category and subcategories from Admin database
          const adminCategory = await AdminExpenseCategoryModel.findOne({
            _id: catId,
            "subcategories._id": { $in: subcategoriesId },
          }).select("_id subcategories");

          if (!adminCategory) {
            continue; // Skip if category doesn't exist
          }

          // Filter subcategories based on their active status
          const validSubcategories = adminCategory.subcategories.filter((sub) =>
            subcategoriesId.includes(sub._id.toString())
          );

          for (const sub of validSubcategories) {
            // Reflect the admin status in the user database
            await UserExpenseCategory.updateMany(
              {
                "expenseCategories.categoryId": catId,
                "expenseCategories.subcategoryIds.subcategoryId": sub._id,
              },
              {
                $set: {
                  "expenseCategories.$[category].subcategoryIds.$[sub].isSubcategoryActive":
                    sub.isSubCategoryActive,
                },
              },
              {
                arrayFilters: [
                  { "category.categoryId": catId },
                  { "sub.subcategoryId": sub._id },
                ],
              }
            );
          }
        }
      }

      next(); // Let the route handler know that middleware is done
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update user data during soft delete.",
        error: error.message,
      });
    }
  };

// Middleware for restore soft delete(mean make active type : true) UserExpenseCategory and subcategory after restore soft delete in admin expense category

export const restoreUserExpenseCategoryByAdminChanged =
  (adminDbConnection, userDbConnection) =>
  async (req, res, categoryIds, restoredata) => {
    const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);
    const UserExpenseCategory = UserExpenseCategoryModel(userDbConnection);

    const userChanges = {
      updatedCategories: [],
      updatedSubcategories: [],
      alreadyRestoredCategories: [],
      alreadyRestoredSubcategories: [],
    };

    try {
      // Case 1: Handle category restore in user database
      if (categoryIds && Array.isArray(categoryIds)) {
        // Fetch all matching categories and their subcategories from the admin database
        const adminCategories = await AdminExpenseCategoryModel.find({
          _id: { $in: categoryIds },
        }).select("_id subcategories");

        for (const category of adminCategories) {
          // Find the category in the user's expenseCategories
          const userCategory = await UserExpenseCategory.findOne({
            "expenseCategories.categoryId": category._id,
          });

          if (userCategory) {
            const categoryInUserDb = userCategory.expenseCategories.find(
              (cat) => cat.categoryId.toString() === category._id.toString()
            );

            // Restore the category if it's inactive
            if (categoryInUserDb && !categoryInUserDb.isCategoryActive) {
              await UserExpenseCategory.updateMany(
                { "expenseCategories.categoryId": category._id },
                {
                  $set: {
                    "expenseCategories.$[category].isCategoryActive": true,
                  },
                },
                {
                  arrayFilters: [{ "category.categoryId": category._id }],
                }
              );
              userChanges.updatedCategories.push(category._id); // Track updated category
            } else if (categoryInUserDb) {
              userChanges.alreadyRestoredCategories.push(category._id); // Track already restored category
            }

            // Restore all subcategories within this category
            for (const subcategory of category.subcategories) {
              const subcategoryInUserDb = userCategory.expenseCategories
                .find(
                  (cat) => cat.categoryId.toString() === category._id.toString()
                )
                ?.subcategoryIds.find(
                  (sub) =>
                    sub.subcategoryId.toString() === subcategory._id.toString()
                );

              if (
                subcategoryInUserDb &&
                !subcategoryInUserDb.isSubcategoryActive
              ) {
                await UserExpenseCategory.updateMany(
                  {
                    "expenseCategories.categoryId": category._id,
                    "expenseCategories.subcategoryIds.subcategoryId":
                      subcategory._id,
                  },
                  {
                    $set: {
                      "expenseCategories.$[category].subcategoryIds.$[sub].isSubcategoryActive": true,
                    },
                  },
                  {
                    arrayFilters: [
                      { "category.categoryId": category._id },
                      { "sub.subcategoryId": subcategory._id },
                    ],
                  }
                );
                userChanges.updatedSubcategories.push(subcategory._id); // Track updated subcategory
              } else if (subcategoryInUserDb) {
                userChanges.alreadyRestoredSubcategories.push(subcategory._id); // Track already restored subcategory
              }
            }
          }
        }
      }

      // Case 2: Handle subcategory restore in user database
      if (restoredata && Array.isArray(restoredata)) {
        for (const { categoryIds: catId, subcategoriesId } of restoredata) {
          const adminCategory = await AdminExpenseCategoryModel.findOne({
            _id: catId,
            "subcategories._id": { $in: subcategoriesId },
          }).select("_id subcategories");

          if (!adminCategory) {
            continue;
          }

          const userCategory = await UserExpenseCategory.findOne({
            "expenseCategories.categoryId": catId,
          });

          if (userCategory) {
            const categoryInUserDb = userCategory.expenseCategories.find(
              (cat) => cat.categoryId.toString() === catId.toString()
            );

            if (categoryInUserDb && !categoryInUserDb.isCategoryActive) {
              // Restore category first if soft deleted
              await UserExpenseCategory.updateMany(
                { "expenseCategories.categoryId": catId },
                {
                  $set: {
                    "expenseCategories.$[category].isCategoryActive": true,
                  },
                },
                {
                  arrayFilters: [{ "category.categoryId": catId }],
                }
              );
              userChanges.updatedCategories.push(catId); // Track restored category
            } else {
              userChanges.alreadyRestoredCategories.push(catId);
            }

            // Restore subcategories
            const validSubcategories = adminCategory.subcategories.filter(
              (sub) => subcategoriesId.includes(sub._id.toString())
            );

            for (const sub of validSubcategories) {
              const subcategoryInUserDb = userCategory.expenseCategories
                .find((cat) => cat.categoryId.toString() === catId.toString())
                ?.subcategoryIds.find(
                  (subCat) =>
                    subCat.subcategoryId.toString() === sub._id.toString()
                );

              if (
                subcategoryInUserDb &&
                !subcategoryInUserDb.isSubcategoryActive
              ) {
                // Restore subcategory if soft deleted
                await UserExpenseCategory.updateMany(
                  {
                    "expenseCategories.categoryId": catId,
                    "expenseCategories.subcategoryIds.subcategoryId": sub._id,
                  },
                  {
                    $set: {
                      "expenseCategories.$[category].subcategoryIds.$[sub].isSubcategoryActive": true,
                    },
                  },
                  {
                    arrayFilters: [
                      { "category.categoryId": catId },
                      { "sub.subcategoryId": sub._id },
                    ],
                  }
                );
                userChanges.updatedSubcategories.push(sub._id); // Track restored subcategory
              } else {
                userChanges.alreadyRestoredSubcategories.push(sub._id); // Already restored subcategory
              }
            }
          }
        }
      }

      return userChanges; // Return user changes
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update user data during restore.",
        error: error.message,
      });
    }
  };
