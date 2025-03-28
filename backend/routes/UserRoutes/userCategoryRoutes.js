import express from "express";
import {
  addUserExpenseCategory,
  // addUserIncomeCategory,
  addUserCurrencyAndBudget,
  getUserExpenseCategories,
  getUserIncomeCategories,
  getUserCurrencyAndBudget,
  updateUserCurrencyAndBudget,
  updateUserExpenseCategories,
  deleteUserExpenseSubcategories,
  deleteUserExpenseCategories,
  deleteUserCurrencyCategory,
  // updateUserIncomeCategory,
} from "../../controllers/UserController/userCategoryController.js";

const userCategoryRoute = (userDbConnection, adminDbConnection) => {
  if (!userDbConnection) {
    throw new Error("User database connection is undefined");
  }

  const router = express.Router();

  // ******************************post routes******************************//

  //add expense category
  router.post("/addExpenseCategory", addUserExpenseCategory(userDbConnection));
  // add income category
  // router.post("/addIncomeCategory", addUserIncomeCategory(userDbConnection));
  // add currency and budget
  router.post(
    "/addCurrencyAndBudget",
    addUserCurrencyAndBudget(userDbConnection)
  );

  // *******************************get routes********************************//

  // Expense Categories Route
  router.get(
    "/expenseCategories/get/:userId",
    getUserExpenseCategories(userDbConnection, adminDbConnection)
  );

  // Income Categories Route(we can fatch the income category using the user profession and fetch category into the admin database)
  router.get(
    "/incomeCategories/get/:userId",
    getUserIncomeCategories(userDbConnection, adminDbConnection)
  );

  // Currency and Budget Route
  router.get(
    "/currencyAndBudget/get/:userId",
    getUserCurrencyAndBudget(userDbConnection, adminDbConnection)
  );

  //*************************************update routes*******************************/

  // Route to update user currency categories and budget

  // router.put(
  //   "/incomeCategory/updateIncomeCategory/:userId",
  //   updateUserIncomeCategory(userDbConnection, adminDbConnection)
  // );

  router.put(
    "/expenseCategory/updateExpenseCategory/:userId",
    updateUserExpenseCategories(userDbConnection, adminDbConnection)
  );
  router.put(
    "/currencyAndBudget/updateCurrency/:userId",
    updateUserCurrencyAndBudget(userDbConnection, adminDbConnection)
  );

  //***********************************Delete Route*****************************************/

  // delete user expense category forn userdatabase(if category deleted then all sub-category will be auto delete from user database)
  router.delete(
    "/expenseCategory/deleteExpenseCategory/:userId",
    deleteUserExpenseCategories(userDbConnection)
  );

  // delete user expense sub-categories from userdatabase
  router.delete(
    "/expenseCategory/deleteExpenseSubCategory/:userId",
    deleteUserExpenseSubcategories(userDbConnection)
  );

  //delete currency category
  router.delete(
    "/currencyCategory/deleteCureencyCategory/:userId",
    deleteUserCurrencyCategory(userDbConnection)
  );

  return router;
};

export default userCategoryRoute; 
