import mongoose from "mongoose";

// UserExpenseCategoryModel Schema
const UserExpenseCategorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserProfile",
    required: true,
  },
  expenseCategories: [
    {
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminExpenseCategory",
        required: true,
      },
      isCategoryActive: {
        type: Boolean,
        required: true,
        default: true,
      },
      subcategoryIds: [
        {
          subcategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminExpenseCategory.subcategories",
          },
          isSubcategoryActive: {
            type: Boolean,
            required: true,
            default: true,
          },
        },
      ],
    },
  ],
});

// UserIncomeCategoryModel Schema
const UserIncomeCategorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserProfile",
    required: true,
  },
  incomeCategories: [
    {
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminIncomeCategory",
        required: true,
      },
      subcategoryIds: [
        {
          subcategoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminExpenseCategory.subcategories",
          },
          isSubcategoryActive: {
            type: Boolean,
            required: true,
            default: true,
          },
        },
      ],
    },
  ],
});

// UserCurrencyAndBudgetModel Schema
const UserCurrencyAndBudgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserProfile",
    required: true,
  },
  currencyCategory: [
    {
      currencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AdminCurrencyCategory", // Reference to the AdminCurrencyCategory model
        required: true,
      },
      isCurrencyActive: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
  ],
  defaultCurrency: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "AdminCurrencyCategory",
  },
  budget: [
    {
      offlineBudget: { type: String, required: true, default: "0" },
      onlineBudget: { type: String, required: true, default: "0" },
    },
  ],
});

export const UserExpenseCategoryModel = (userDbConnection) => {
  return userDbConnection.model(
    "UserExpenseCategoryData",
    UserExpenseCategorySchema
  );
};
export const UserIncomeCategoryModel = (userDbConnection) => {
  return userDbConnection.model(
    "UserIncomeCategoryData",
    UserIncomeCategorySchema
  );
};
export const UserCurrencyAndBudgetModel = (userDbConnection) => {
  return userDbConnection.model(
    "UserCurrencyAndBudgetData",
    UserCurrencyAndBudgetSchema
  );
};

export default {
  UserExpenseCategoryModel,
  UserIncomeCategoryModel,
  UserCurrencyAndBudgetModel,
};
