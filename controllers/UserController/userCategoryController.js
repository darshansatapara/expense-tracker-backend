import {
  UserExpenseCategoryModel,
  UserIncomeCategoryModel,
  UserCurrencyAndBudgetModel,
} from "../../models/UserModel/UserCategoryModels.js";
import UserProfileModel from "../../models/UserModel/UserProfileModel.js";
import {
  AdminCurrencyCategory,
  AdminExpenseCategory,
  AdminIncomeCategory,
} from "../../models/AdminModel/AdminCategoryModels.js";

//************************************EXPENSE Controller************************************
// Add User Expense Categories for this the sending formate is
/*{
  "userId": "64b3b2f4d8e11b0012dabc34",
  "expenseCategories": [
    {
      "categoryId": "64b3b2f4d8e11b0012dabc35",
      "subcategoryIds": [
        "64b3b2f4d8e11b0012dabc36",
        "64b3b2f4d8e11b0012dabc37"
      ]
    }
  ]
}*/

export const addUserExpenseCategory =
  (userDbConnection) => async (req, res) => {
    const { userId, expenseCategories } = req.body;
    console.log(userId, expenseCategories);

    if (!userId || !expenseCategories) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId and expenseCategories.",
      });
    }

    try {
      const UserExpenseCategory = UserExpenseCategoryModel(userDbConnection);

      // Transform subcategoryIds from strings to objects if necessary
      const transformedCategories = expenseCategories.map((category) => ({
        ...category,
        subcategoryIds: category.subcategoryIds.map((id) => ({
          subcategoryId: id,
        })),
      }));

      const existingRecord = await UserExpenseCategory.findOne({ userId });

      if (existingRecord) {
        // Append new categories without duplicates
        const updatedCategories = [
          ...existingRecord.expenseCategories,
          ...transformedCategories.filter(
            (newCategory) =>
              !existingRecord.expenseCategories.some(
                (existing) =>
                  existing.categoryId.toString() === newCategory.categoryId
              )
          ),
        ];

        existingRecord.expenseCategories = updatedCategories;
        await existingRecord.save();

        return res.status(200).json({
          success: true,
          message: "Expense categories updated successfully.",
          data: existingRecord,
        });
      }

      // Create a new record
      const newExpenseCategory = new UserExpenseCategory({
        userId,
        expenseCategories: transformedCategories,
      });

      const savedCategory = await newExpenseCategory.save();

      res.status(201).json({
        success: true,
        message: "Expense categories added successfully.",
        data: savedCategory,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add expense categories.",
        error: error.message,
      });
    }
  };

// get User Expense Categories Controller
export const getUserExpenseCategories =
  (userDbConnection, adminDbConnection) => async (req, res) => {
    const { userId } = req.params;

    try {
      const UserExpenseCategory = UserExpenseCategoryModel(userDbConnection);
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

      // Fetch the user's expense categories
      const userExpenseData = await UserExpenseCategory.findOne({ userId });

      if (!userExpenseData) {
        return res.status(404).json({
          success: false,
          message: "No expense categories found for this user.",
        });
      }

      // Extract categoryIds from user data
      const categoryIds = userExpenseData.expenseCategories.map(
        (item) => item.categoryId
      );

      // Fetch corresponding categories from the admin database
      const categories = await AdminExpenseCategoryModel.find({
        _id: { $in: categoryIds },
        isCategoryActive: true, // Fetch only active categories
      });

      // Map and filter the user's expense categories
      const filteredExpenseCategories = userExpenseData.expenseCategories
        .map((expenseCategory) => {
          const category = categories.find(
            (adminCategory) =>
              adminCategory._id.toString() ===
              expenseCategory.categoryId.toString()
          );

          if (!category) {
            return null; // Skip categories not found in the admin database
          }

          // Filter the subcategories based on user and admin data
          const filteredSubcategories = expenseCategory.subcategoryIds
            .map((userSub) => {
              const subcategory = category.subcategories.find(
                (adminSub) =>
                  adminSub._id.toString() ===
                    userSub.subcategoryId.toString() &&
                  adminSub.isSubCategoryActive // Only active subcategories
              );
              return subcategory
                ? { _id: subcategory._id, name: subcategory.name }
                : null; // Skip if no match or inactive
            })
            .filter(Boolean); // Remove nulls

          return {
            _id: expenseCategory._id,
            categoryId: {
              _id: category._id,
              name: category.name,
            },
            subcategoryIds: filteredSubcategories,
          };
        })
        .filter(Boolean); // Remove null categories

      // Respond with the filtered data
      res.status(200).json({
        success: true,
        data: {
          ...userExpenseData.toObject(),
          expenseCategories: filteredExpenseCategories,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };

// update route to add new expense category and subcategory in the userdatabase
/*
  {
  "newExpenseCategory": [
    {
      "categoryId": "6774dfd2a75ec7e9ef49e89e",
      "subcategoryIds": [
        "6774dfd2a75ec7e9ef49e894",
        "6774dfd2a75ec7e9ef49e896"
      ]
    },
    {
      "categoryId": "6774dfd4a75ec7e9ef49e8ad",
      "subcategoryIds": [
        "6774dfd4a75ec7e9ef49e8a1"
      ]
    }
  ]
}*/
export const updateUserExpenseCategories =
  (userDbConnection, adminDbConnection) => async (req, res) => {
    const { userId } = req.params;
    const { newExpenseCategory } = req.body;

    if (!userId || !newExpenseCategory || !Array.isArray(newExpenseCategory)) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId and a valid newExpenseCategory array.",
      });
    }

    try {
      const UserExpenseCategory = UserExpenseCategoryModel(userDbConnection);
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

      // Fetch user data
      let userExpenseData = await UserExpenseCategory.findOne({ userId });

      if (!userExpenseData) {
        // Create a new record if user data does not exist
        userExpenseData = new UserExpenseCategory({
          userId,
          expenseCategories: [],
        });
      }

      // Map of existing categories for quick lookup
      const existingCategoriesMap = Object.fromEntries(
        userExpenseData.expenseCategories.map((cat) => [
          cat.categoryId.toString(),
          cat,
        ])
      );

      // Validate and process newExpenseCategory
      for (const newCategory of newExpenseCategory) {
        const { categoryId, subcategoryIds } = newCategory;

        // Validate category in admin database
        const adminCategory = await AdminExpenseCategoryModel.findById(
          categoryId
        );

        if (!adminCategory) {
          return res.status(404).json({
            success: false,
            message: `Category with ID ${categoryId} not found in admin database.`,
          });
        }

        // Validate subcategories in admin database
        const validSubcategories = adminCategory.subcategories.filter((sub) =>
          subcategoryIds.includes(sub._id.toString())
        );

        if (validSubcategories.length !== subcategoryIds.length) {
          return res.status(400).json({
            success: false,
            message: `One or more subcategories for category ${categoryId} are invalid.`,
          });
        }

        // Add or update category and subcategories
        if (existingCategoriesMap[categoryId]) {
          // Update subcategories and activate the category
          const existingCategory = existingCategoriesMap[categoryId];
          existingCategory.isCategoryActive = true;
          const updatedSubcategories = [
            ...new Set([
              ...existingCategory.subcategoryIds.map((sub) =>
                sub.subcategoryId.toString()
              ),
              ...validSubcategories.map((sub) => sub._id.toString()),
            ]),
          ].map((id) => ({
            subcategoryId: id,
            isSubcategoryActive: true,
          }));
          existingCategory.subcategoryIds = updatedSubcategories;
        } else {
          // Add new category
          userExpenseData.expenseCategories.push({
            categoryId,
            isCategoryActive: true,
            subcategoryIds: validSubcategories.map((sub) => ({
              subcategoryId: sub._id.toString(),
              isSubcategoryActive: true,
            })),
          });
        }
      }

      // Save the updated user expense categories
      const updatedUserExpenseData = await userExpenseData.save();

      res.status(200).json({
        success: true,
        message: "Expense categories updated successfully.",
        data: updatedUserExpenseData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update expense categories.",
        error: error.message,
      });
    }
  };

//delete user expense categories (if user can remove category, then accordingly their subcategories will be removed)

/*
{
  "deleteCategoryIds": [
    "64a3e97e8f5b9b0023ae4d1b",
    "64a3e97e8f5b9b0023ae4d1c"
  ]
}

*/
export const deleteUserExpenseCategories =
  (userDbConnection) => async (req, res) => {
    const { userId } = req.params;
    const { deleteCategoryIds } = req.body;

    if (
      !userId ||
      !Array.isArray(deleteCategoryIds) ||
      deleteCategoryIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid userId and a deleteCategoryIds array.",
      });
    }

    try {
      const UserExpenseCategory = UserExpenseCategoryModel(userDbConnection);

      // Fetch the user's data
      const userExpenseData = await UserExpenseCategory.findOne({ userId });

      if (!userExpenseData) {
        return res.status(404).json({
          success: false,
          message: "User expense data not found.",
        });
      }

      // Remove categories and their subcategories
      userExpenseData.expenseCategories =
        userExpenseData.expenseCategories.filter(
          (category) =>
            !deleteCategoryIds.includes(category.categoryId.toString())
        );

      // Save the updated document
      const updatedUserData = await userExpenseData.save();

      res.status(200).json({
        success: true,
        message: "Categories and their subcategories deleted successfully.",
        data: updatedUserData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete categories.",
        error: error.message,
      });
    }
  };

// delete only user sub-category in this route (..category have > 2 sub-categories)
/* {
  "CategoryDeleteData": [
    {
      "categoryId": "64a3e97e8f5b9b0023ae4d1b",
      "subcategoryIds": [
        "64a3ea6d8f5b9b0023ae4d1d",
        "64a3ea6d8f5b9b0023ae4d1e"
      ]
    },
    {
      "categoryId": "64a3e97e8f5b9b0023ae4d1c",
      "subcategoryIds": [
        "64a3ea6d8f5b9b0023ae4d1f"
      ]
    }
  ]
}
*/
export const deleteUserExpenseSubcategories =
  (userDbConnection) => async (req, res) => {
    const { userId } = req.params;
    const { CategoryDeleteData } = req.body;

    if (
      !userId ||
      !Array.isArray(CategoryDeleteData) ||
      CategoryDeleteData.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId and a valid CategoryDeleteData array.",
      });
    }

    try {
      const UserExpenseCategory = UserExpenseCategoryModel(userDbConnection);

      // Fetch user's expense data
      const userExpenseData = await UserExpenseCategory.findOne({ userId });

      if (!userExpenseData) {
        return res.status(404).json({
          success: false,
          message: "No expense data found for the given user.",
        });
      }

      // Prepare updated expense categories
      const updatedExpenseCategories = userExpenseData.expenseCategories.map(
        (userCategory) => {
          const categoryToDelete = CategoryDeleteData.find(
            (delCat) => delCat.categoryId === userCategory.categoryId.toString()
          );

          // Skip categories not in delete data
          if (!categoryToDelete) return userCategory;

          // Remove specified subcategories
          userCategory.subcategoryIds = userCategory.subcategoryIds.filter(
            (sub) =>
              !categoryToDelete.subcategoryIds.includes(
                sub.subcategoryId.toString()
              )
          );

          return userCategory;
        }
      );

      // Remove any categories that no longer have subcategories
      const filteredCategories = updatedExpenseCategories.filter(
        (category) => category.subcategoryIds.length > 0
      );

      // Update user data
      userExpenseData.expenseCategories = filteredCategories;
      const updatedUserExpenseData = await userExpenseData.save();

      res.status(200).json({
        success: true,
        message: "Subcategories removed successfully.",
        data: updatedUserExpenseData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete subcategories.",
        error: error.message,
      });
    }
  };

// ****************************************INCOME Controllers***********************************
// Add User Income Categories
// export const addUserIncomeCategory = (userDbConnection) => async (req, res) => {
//   const { userId, incomeCategories } = req.body;

//   if (!userId || !incomeCategories) {
//     return res.status(400).json({
//       success: false,
//       message: "Please provide userId and incomeCategories.",
//     });
//   }

//   try {
//     const UserIncomeCategory = UserIncomeCategoryModel(userDbConnection);

//     const existingRecord = await UserIncomeCategory.findOne({ userId });

//     if (existingRecord) {
//       // Append new categories without duplicates
//       const updatedCategories = [
//         ...existingRecord.incomeCategories,
//         ...incomeCategories.filter(
//           (newCategory) =>
//             !existingRecord.incomeCategories.some(
//               (existing) =>
//                 existing.categoryId.toString() === newCategory.categoryId
//             )
//         ),
//       ];

//       existingRecord.incomeCategories = updatedCategories;
//       await existingRecord.save();

//       return res.status(200).json({
//         success: true,
//         message: "Income categories updated successfully.",
//         data: existingRecord,
//       });
//     }

//     // Create a new record
//     const newIncomeCategory = new UserIncomeCategory({
//       userId,
//       incomeCategories,
//     });

//     const savedCategory = await newIncomeCategory.save();

//     res.status(201).json({
//       success: true,
//       message: "Income categories added successfully.",
//       data: savedCategory,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to add income categories.",
//       error: error.message,
//     });
//   }
// };

// get User Income Categories Controller
export const getUserIncomeCategories =
  (userDbConnection, adminDbConnection) => async (req, res) => {
    const { userId } = req.params;

    try {
      const UserProfile = UserProfileModel(userDbConnection);
      const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);

      // Fetch user's profession using userId
      const user = await UserProfile.findOne({ _id: userId }).lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User with ID ${userId} not found.`,
        });
      }

      const { profession } = user;

      if (!profession) {
        return res.status(400).json({
          success: false,
          message: `User with ID ${userId} does not have a profession set.`,
        });
      }

      // Fetch income categories from the Admin database based on the profession
      const categories = await AdminIncomeCategoryModel.find({
        name: profession,
      }).lean();

      if (!categories.length) {
        return res.status(404).json({
          success: false,
          message: `No income categories found for profession: ${profession}`,
        });
      }

      res.status(200).json({
        success: true,
        data: {
          profession,
          incomeCategories: categories,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

/*export const updateUserIncomeCategory =
  (userDbConnection, adminDbConnection) => async (req, res) => {
    const { userId, newUpdatedCategories } = req.body;

    if (!userId || !newUpdatedCategories) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId and updatedCategories.",
      });
    }

    try {
      const UserIncomeCategory = UserIncomeCategoryModel(userDbConnection);
      const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);

      // Fetch the user's existing income categories
      const existingRecord = await UserIncomeCategory.findOne({ userId });

      if (!existingRecord) {
        return res.status(404).json({
          success: false,
          message: "No income categories found for this user.",
        });
      }

      // Validate categories against the admin database
      const adminCategoryIds = newUpdatedCategories.map(
        (item) => item.categoryId
      );
      const adminCategories = await AdminIncomeCategoryModel.find({
        _id: { $in: adminCategoryIds },
      }).lean();

      if (adminCategories.length !== adminCategoryIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some provided category IDs are invalid.",
        });
      }

      // Map admin categories for validation and quick access
      const adminCategoryMap = Object.fromEntries(
        adminCategories.map((cat) => [cat._id.toString(), cat])
      );

      // Process updated categories
      newUpdatedCategories.forEach(({ categoryId, subcategoryIds }) => {
        const adminCategory = adminCategoryMap[categoryId];

        if (!adminCategory) {
          throw new Error(`Category with ID ${categoryId} not found.`);
        }

        // Filter valid subcategories from the admin category
        const validSubcategories = subcategoryIds.filter((subId) =>
          adminCategory.subcategories.some(
            (sub) => sub._id.toString() === subId
          )
        );

        // Find the existing category in the user's record
        const existingCategory = existingRecord.incomeCategories.find(
          (cat) => cat.categoryId.toString() === categoryId
        );

        if (existingCategory) {
          // Append only new subcategories to the existing category
          existingCategory.subcategoryIds = [
            ...new Set([
              ...existingCategory.subcategoryIds,
              ...validSubcategories,
            ]),
          ];
        } else {
          // Add a new category with valid subcategories
          existingRecord.incomeCategories.push({
            categoryId,
            subcategoryIds: validSubcategories,
          });
        }
      });

      // Save the updated record
      await existingRecord.save();

      // Populate the updated data for response
      const populatedData = await UserIncomeCategory.findOne({
        userId,
      }).populate({
        path: "incomeCategories.categoryId",
        model: AdminIncomeCategoryModel,
      });

      res.status(200).json({
        success: true,
        message: "Income categories updated successfully.",
        data: populatedData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update income categories.",
        error: error.message,
      });
    }
   };*/

/*********************************Currnecy Controller***********************************/

// Add User Currency and Budget
/* example input
{
  "userId": "64b3b2f4d8e11b0012dabc34",
  "currencyCategory": ["64b3b2f4d8e11b0012dabc35", "64b3b2f4d8e11b0012dabc36"],
  "budget": [
    {
      "offlineBudget": "500",
      "onlineBudget": "1000"
    }
  ],
  "defaultCurrency": "64b3b2f4d8e11b0012dabc35"
}
*/
export const addUserCurrencyAndBudget =
  (userDbConnection) => async (req, res) => {
    const { userId, currencyCategory, budget, defaultCurrency } = req.body;

    if (!userId || !currencyCategory || !budget || !defaultCurrency) {
      return res.status(400).json({
        success: false,
        message: "Please provide userId, currencyCategory, and budget.",
      });
    }

    try {
      const UserCurrencyAndBudget =
        UserCurrencyAndBudgetModel(userDbConnection);

      // Transform currencyCategory from an array of IDs to an array of objects
      const transformedCurrencyCategory = currencyCategory.map(
        (currencyId) => ({
          currencyId,
          isCurrencyActive: true, // Default is true
        })
      );

      const existingRecord = await UserCurrencyAndBudget.findOne({ userId });

      if (existingRecord) {
        // Update currency category and budget
        existingRecord.currencyCategory = transformedCurrencyCategory;
        existingRecord.budget = budget;
        existingRecord.defaultCurrency = defaultCurrency;

        await existingRecord.save();

        return res.status(200).json({
          success: true,
          message: "Currency and budget updated successfully.",
          data: existingRecord,
        });
      }

      // Create a new record
      const newCurrencyAndBudget = new UserCurrencyAndBudget({
        userId,
        currencyCategory: transformedCurrencyCategory,
        budget,
        defaultCurrency,
      });

      const savedRecord = await newCurrencyAndBudget.save();

      res.status(201).json({
        success: true,
        message: "Currency and budget added successfully.",
        data: savedRecord,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add currency and budget.",
        error: error.message,
      });
    }
  };

// User Currency and Budget Controller
export const getUserCurrencyAndBudget =
  (userDbConnection, adminDbConnection) => async (req, res) => {
    const { userId } = req.params;

    try {
      // Ensure models are initialized correctly for their respective databases
      const UserCurrencyAndBudget =
        UserCurrencyAndBudgetModel(userDbConnection);
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);

      // Fetch the user's currency and budget data with full details populated
      const userCurrencyAndBudgetData = await UserCurrencyAndBudget.findOne({
        userId,
      })
        .populate({
          path: "currencyCategory.currencyId",
          model: AdminCurrencyCategoryModel,
          select: "currency name symbol isCurrencyActive", // Include all relevant fields
        })
        .populate({
          path: "defaultCurrency",
          model: AdminCurrencyCategoryModel,
          select: "currency name symbol", // Include relevant fields for the default currency
        });

      if (!userCurrencyAndBudgetData) {
        return res.status(404).json({
          success: false,
          message: "No currency and budget data found for the user.",
        });
      }

      // Return populated data in the response
      res.status(200).json({
        success: true,
        data: userCurrencyAndBudgetData,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

//update user currency and budget data
/*
{
  "newCurrencyCategoryIds": [
    "64f11b0e2f4d86f12345abc1",
    "64f11b0e2f4d86f12345abc2"
  ],
  "budget": [
    {
      "offlineBudget": "7000",
      "onlineBudget": "4500"
    }
  ]
}

*/
export const updateUserCurrencyAndBudget =
  (userDbConnection, adminDbConnection) => async (req, res) => {
    const { userId } = req.params;
    const { newCurrencyCategoryIds, budget, defaultCurrency } = req.body;

    try {
      // Validate if neither categories nor budget are provided
      if (!newCurrencyCategoryIds || !budget || !defaultCurrency) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide either new currency category ObjectIds or budget data (offline/online).",
        });
      }

      // Initialize models
      const UserCurrencyAndBudget =
        UserCurrencyAndBudgetModel(userDbConnection);
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);

      // Check if the user already has a budget entry
      const userData = await UserCurrencyAndBudget.findOne({ userId });

      if (!userData) {
        return res.status(404).json({
          success: false,
          message: "No existing data found for the user.",
        });
      }

      // Handle case where budget is provided
      if (budget) {
        const { offlineBudget, onlineBudget } = budget[0]; // Extract budget details

        // Ensure that budget values are strings and not undefined
        const updateData = {};
        if (offlineBudget !== undefined) {
          updateData["budget.0.offlineBudget"] = offlineBudget.toString();
        }
        if (onlineBudget !== undefined) {
          updateData["budget.0.onlineBudget"] = onlineBudget.toString();
        }

        // If update data exists, perform the update
        if (Object.keys(updateData).length > 0) {
          await UserCurrencyAndBudget.updateOne(
            { userId },
            { $set: updateData }
          );
        }
      }

      // Handle case where new currency category IDs are provided
      if (
        newCurrencyCategoryIds &&
        Array.isArray(newCurrencyCategoryIds) &&
        newCurrencyCategoryIds.length > 0
      ) {
        // Validate the category IDs exist in the admin database
        const validCategories = await AdminCurrencyCategoryModel.find({
          _id: { $in: newCurrencyCategoryIds },
        });

        if (validCategories.length !== newCurrencyCategoryIds.length) {
          return res.status(400).json({
            success: false,
            message: "Some provided currency category ObjectIds are invalid.",
          });
        }

        // Add or update new currency categories
        for (const currencyId of newCurrencyCategoryIds) {
          const existingCurrency = userData.currencyCategory.find(
            (cat) => cat.currencyId.toString() === currencyId
          );

          if (existingCurrency) {
            // Ensure the currency is active
            existingCurrency.isCurrencyActive = true;
          } else {
            // Add the new currency category
            userData.currencyCategory.push({
              currencyId,
              isCurrencyActive: true,
            });
          }
        }

        // Save the updated data
        await userData.save();
      }

      // Update default currency
      if (defaultCurrency) {
        // Validate that the default currency exists in the admin database
        const validDefaultCurrency = await AdminCurrencyCategoryModel.findById(
          defaultCurrency
        );
        if (!validDefaultCurrency) {
          return res.status(400).json({
            success: false,
            message: "Invalid default currency ID provided.",
          });
        }

        // Update the default currency field
        userData.defaultCurrency = defaultCurrency;
        await userData.save();
      }

      // Fetch updated data for response
      const updatedData = await UserCurrencyAndBudget.findOne({ userId })
        .populate({
          path: "currencyCategory.currencyId",
          model: AdminCurrencyCategoryModel,
        })
        .populate({
          path: "defaultCurrency",
          model: AdminCurrencyCategoryModel,
        })
        .exec();

      if (!updatedData) {
        return res.status(404).json({
          success: false,
          message: "No currency and budget data found for the user.",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Currency categories, default currency, and/or budget updated successfully.",
        data: updatedData,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  };

//delete currency category form user database
/*
{
  "deleteCurrencyCategoryIds": [
    "64f11b0e2f4d86f12345abc1",
    "64f11b0e2f4d86f12345abc2"
  ]
}

*/

export const deleteUserCurrencyCategory =
  (userDbConnection) => async (req, res) => {
    const { userId } = req.params;
    const { deleteCurrencyCategoryIds } = req.body;

    // Validate input
    if (
      !userId ||
      !Array.isArray(deleteCurrencyCategoryIds) ||
      deleteCurrencyCategoryIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid userId and deleteCurrencyCategoryIds array.",
      });
    }

    try {
      // Initialize the user model
      const UserCurrencyAndBudget =
        UserCurrencyAndBudgetModel(userDbConnection);

      // Fetch user data
      const userCurrencyAndBudgetData = await UserCurrencyAndBudget.findOne({
        userId,
      });

      if (!userCurrencyAndBudgetData) {
        return res.status(404).json({
          success: false,
          message: "User currency and budget data not found.",
        });
      }

      // Filter out the categories to be deleted
      const updatedCurrencyCategories =
        userCurrencyAndBudgetData.currencyCategory.filter(
          (currency) =>
            !deleteCurrencyCategoryIds.includes(currency.currencyId.toString())
        );

      // Update the user's currency categories
      userCurrencyAndBudgetData.currencyCategory = updatedCurrencyCategories;

      // Save the changes
      const updatedUserData = await userCurrencyAndBudgetData.save();

      res.status(200).json({
        success: true,
        message: "Currency categories deleted successfully.",
        data: updatedUserData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete currency categories.",
        error: error.message,
      });
    }
  };
