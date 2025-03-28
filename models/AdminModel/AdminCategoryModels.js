import mongoose from "mongoose";

// Admin Expense Category Schema
const AdminExpenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ensure each category name is unique
  },
  isCategoryActive: {
    type: Boolean,
    required: true,
    default: true, // true for active, false for deactive
  },
  subcategories: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      isSubCategoryActive: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
  ],
});

// copy Admin Income Category Schema
const AdminIncomeCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ensure each category name is unique
  },
  // categoryId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   required: true,
  // },
  isCategoryActive: {
    type: Boolean,
    required: true,
    default: true, // true for active, false for deactive
  },
  subcategories: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      isSubCategoryActive: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
  ],
});

// Admin Currency Category Schema
const AdminCurrencyCategorySchema = new mongoose.Schema({
  currency: {
    type: String,
    required: true, // e.g., "USD"
  },
  name: {
    type: String,
    required: true, // e.g., "United States Dollar"
  },
  symbol: {
    type: String,
    required: true, // e.g., "$"
  },
  isCurrencyActive: {
    type: Boolean,
    required: true,
    default: true, // true for active, false for deactive
  },
});

// Export models, passing the correct database connection
export const AdminExpenseCategory = (adminDbConnection) => {
  return adminDbConnection.model(
    "AdminExpenseCategory",
    AdminExpenseCategorySchema
  );
};

export const AdminIncomeCategory = (adminDbConnection) => {
  return adminDbConnection.model(
    "AdminIncomeCategory",
    AdminIncomeCategorySchema
  );
};

export const AdminCurrencyCategory = (adminDbConnection) => {
  return adminDbConnection.model(
    "AdminCurrencyCategory",
    AdminCurrencyCategorySchema
  );
};
