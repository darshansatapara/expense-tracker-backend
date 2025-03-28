import { userExpenseAmountCurrencyConverter } from "../../middlewares/userExpenseAmountCurrencyConverter.js";
import {
  AdminCurrencyCategory,
  AdminExpenseCategory,
} from "../../models/AdminModel/AdminCategoryModels.js";
import CurrencyDailyRateModel from "../../models/CommonModel/CurrencyDailyRatesModel.js";
import { UserCurrencyAndBudgetModel } from "../../models/UserModel/UserCategoryModels.js";
import UserExpense from "../../models/UserModel/UserExpenseDataModel.js";

//add the user expense
/*
{
  "userId": "67792e48b3085a94fc47b110",
  "date": "04-01-2025",
  "mode": "Offline",
  "amount": "250.00",
  "category": "6774dfd2a75ec7e9ef49e89e",
  "subcategory": "6774dfd2a75ec7e9ef49e894",
  "currency": "6774e15f0ae028dfbf4f2c67",
  "note": "travel to collage."
}

*/
export const addUserExpense = (userDbConnection) => async (req, res) => {
  const { userId, date, mode, amount, category, subcategory, currency, note } =
    req.body;
  console.log(req.body);

  if (!userId || !date || !mode || !amount || !category || !currency) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: userId, date, mode, amount, category, currency are mandatory.",
    });
  }

  try {
    const UserExpenseModel = UserExpense(userDbConnection);
    // const formattedDate = dayjs(date, "DD-MM-YYYY").format("DD-MM-YYYY");

    // Find user expenses for the given userId
    let userExpense = await UserExpenseModel.findOne({ userId });

    // Build the expense object
    const newExpense = {
      date,
      mode,
      amount,
      category,
      subcategory,
      currency,
      note,
    };

    if (!userExpense) {
      // Create a new user expense document if none exists
      userExpense = new UserExpenseModel({
        userId,
        expenses: [
          {
            date: date,
            online: mode === "Online" ? [newExpense] : [],
            offline: mode === "Offline" ? [newExpense] : [],
          },
        ],
      });
    } else {
      // Check if an expense entry for the given date exists
      let expenseForDate = userExpense.expenses.find(
        (exp) => exp.date === date
      );

      if (expenseForDate) {
        // Add to the existing online/offline array
        if (mode === "Online") {
          expenseForDate.online.push(newExpense);
        } else {
          expenseForDate.offline.push(newExpense);
        }
      } else {
        // Create a new entry for this date
        userExpense.expenses.push({
          date: date,
          online: mode === "Online" ? [newExpense] : [],
          offline: mode === "Offline" ? [newExpense] : [],
        });
      }
    }

    // Save the updated or newly created document
    await userExpense.save();

    res.status(201).json({
      success: true,
      message: "Expense added successfully.",
      data: userExpense,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({
      success: false,
      message: "Error adding expense.",
      error: error.message,
    });
  }
};



export const getUserExpense =
  (userDbConnection, adminDbConnection) => async (req, res) => {
    const { userId, startDate, endDate } = req.params;

    try {
      // Initialize models with the given database connections
      const UserExpenseModel = UserExpense(userDbConnection);
      const UserCurrencyAndBudget =
        UserCurrencyAndBudgetModel(userDbConnection);
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);
      const AdminExpenseCategoryModel = AdminExpenseCategory(adminDbConnection);

      // Parse the dates (DD-MM-YYYY → YYYY-MM-DD)
      const formattedStartDate = new Date(
        startDate.split("-").reverse().join("-")
      );
      const formattedEndDate = new Date(endDate.split("-").reverse().join("-"));

      // Fetch user's default currency
      const userCurrencyData = await UserCurrencyAndBudget.findOne({
        userId,
      }).populate({
        path: "defaultCurrency",
        model: AdminCurrencyCategoryModel,
        select: "symbol",
      });

      if (!userCurrencyData) {
        return res.status(404).json({
          success: false,
          message: "User currency data not found.",
        });
      }

      const defaultCurrencyId = userCurrencyData.defaultCurrency?._id;

      // Fetch user expenses with populated currency and category details
      const userExpenses = await UserExpenseModel.findOne({ userId })
        .populate({
          path: "expenses.online.currency",
          model: AdminCurrencyCategoryModel,
          select: "symbol",
        })
        .populate({
          path: "expenses.offline.currency",
          model: AdminCurrencyCategoryModel,
          select: "symbol",
        })
        .populate({
          path: "expenses.online.category",
          model: AdminExpenseCategoryModel,
          select: "name subcategories",
        })
        .populate({
          path: "expenses.offline.category",
          model: AdminExpenseCategoryModel,
          select: "name subcategories",
        });

      if (!userExpenses) {
        return res.status(404).json({
          success: false,
          message: "No expenses found for this user.",
        });
      }

      const filteredExpenses = [];

      // Filter expenses by date and calculate exchange rates
      for (const expenseGroup of userExpenses.expenses) {
        const expenseDate = new Date(
          expenseGroup.date.split("-").reverse().join("-")
        );

        if (
          expenseDate >= formattedStartDate &&
          expenseDate <= formattedEndDate
        ) {
          filteredExpenses.push({
            date: expenseGroup.date,
            online: await Promise.all(
              expenseGroup.online.map(async (expense) => ({
                date: expense.date,
                mode: expense.mode,
                amount: expense.amount,
                currency: expense.currency
                  ? expense.currency.symbol
                  : "Unknown",
                category: expense.category ? expense.category.name : "Unknown",
                subcategory:
                  expense.category?.subcategories.find(
                    (sub) =>
                      sub._id.toString() === expense.subcategory?.toString()
                  )?.name || "Unknown",
                convertedAmount: await userExpenseAmountCurrencyConverter(
                  adminDbConnection,
                  expense.date,
                  expense.amount,
                  expense.currency?._id,
                  defaultCurrencyId
                ),
                note: expense.note,
                _id: expense._id,
              }))
            ),
            offline: await Promise.all(
              expenseGroup.offline.map(async (expense) => ({
                date: expense.date,
                mode: expense.mode,
                amount: expense.amount,
                currency: expense.currency
                  ? expense.currency.symbol
                  : "Unknown",
                category: expense.category ? expense.category.name : "Unknown",
                subcategory:
                  expense.category?.subcategories.find(
                    (sub) =>
                      sub._id.toString() === expense.subcategory?.toString()
                  )?.name || "Unknown",
                convertedAmount: await userExpenseAmountCurrencyConverter(
                  adminDbConnection,
                  expense.date,
                  expense.amount,
                  expense.currency?._id,
                  defaultCurrencyId
                ),
                note: expense.note,
                _id: expense._id,
              }))
            ),
          });
        }
      }

      if (!filteredExpenses.length) {
        return res.status(404).json({
          success: false,
          message: "No expenses found for the specified date range.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Expenses retrieved successfully.",
        expenses: filteredExpenses,
      });
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching expenses.",
        error: error.message,
      });
    }
  };

// Update expense details
/**{
  "date": "05-01-2025",          // New Date
  "mode": "Online",              // Mode to filter (Online or Offline)
  "amount": "300.00",            // New amount (optional)
  "category": "categoryId",      // New category (optional)
  "currency": "currencyId",      // New currency (optional)
  "subcategory": "subcategoryId",// New subcategory (optional)
  "note": "New note",            // New note (optional)
  "expenseId": "expenseId"       // The expenseId to be updated
}
 */
export const updateUserExpense = (userDbConnection) => async (req, res) => {
  const { userId, expenseDate } = req.params;
  const {
    date,
    mode,
    amount,
    category,
    currency,
    subcategory,
    note,
    expenseId,
  } = req.body;

  try {
    const UserExpenseModel = UserExpense(userDbConnection);
    const userExpenses = await UserExpenseModel.findOne({ userId });

    if (!userExpenses) {
      return res.status(404).json({ message: "User expenses not found." });
    }

    // Find the expense date object to update
    const expenseDateObj = userExpenses.expenses.find(
      (exp) => exp.date === expenseDate
    );

    if (!expenseDateObj) {
      return res.status(404).json({ message: "Expense date not found." });
    }

    // Find the expense to update
    const currentModeArray = [
      ...expenseDateObj.online,
      ...expenseDateObj.offline,
    ];
    const expenseIndex = currentModeArray.findIndex(
      (exp) => exp._id.toString() === expenseId
    );

    if (expenseIndex === -1) {
      return res.status(404).json({ message: "Expense not found." });
    }

    let expenseToUpdate = currentModeArray[expenseIndex];

    // Update the expense fields with provided data
    expenseToUpdate.date = date ?? expenseToUpdate.date;
    expenseToUpdate.amount = amount ?? expenseToUpdate.amount;
    expenseToUpdate.currency = currency ?? expenseToUpdate.currency;
    expenseToUpdate.category = category ?? expenseToUpdate.category;
    expenseToUpdate.subcategory = subcategory ?? expenseToUpdate.subcategory;
    expenseToUpdate.note = note ?? expenseToUpdate.note;

    // Handle the three possible scenarios:
    // 1. Only the date changes, but mode remains the same
    if (expenseToUpdate.date !== expenseDate && expenseToUpdate.mode === mode) {
      // Remove the expense from the old date's mode array by expenseId
      const oldExpenseDateObj = userExpenses.expenses.find(
        (exp) => exp.date === expenseDate
      );
      if (oldExpenseDateObj) {
        const oldModeArray =
          expenseToUpdate.mode === "Online"
            ? oldExpenseDateObj.online
            : oldExpenseDateObj.offline;
        const expenseIndexToRemove = oldModeArray.findIndex(
          (exp) => exp._id.toString() === expenseId
        );
        if (expenseIndexToRemove !== -1) {
          oldModeArray.splice(expenseIndexToRemove, 1); // Remove the expense by expenseId
        }
      }

      // Add the expense to the new date object (create it if necessary)
      let newExpenseDateObj = userExpenses.expenses.find(
        (exp) => exp.date === expenseToUpdate.date
      );

      if (!newExpenseDateObj) {
        newExpenseDateObj = {
          date: expenseToUpdate.date,
          online: [],
          offline: [],
        };
        userExpenses.expenses.push(newExpenseDateObj);
      }

      // Add the expense to the correct mode array (Online or Offline)
      if (expenseToUpdate.mode === "Online") {
        newExpenseDateObj.online.push(expenseToUpdate);
      } else {
        newExpenseDateObj.offline.push(expenseToUpdate);
      }
    }

    // 2. Only the mode changes, but date remains the same
    else if (
      expenseToUpdate.date === expenseDate &&
      expenseToUpdate.mode !== mode
    ) {
      // Remove the expense from the old mode array by expenseId
      const oldExpenseDateObj = userExpenses.expenses.find(
        (exp) => exp.date === expenseDate
      );
      if (oldExpenseDateObj) {
        const oldModeArray =
          expenseToUpdate.mode === "Online"
            ? oldExpenseDateObj.online
            : oldExpenseDateObj.offline;
        const expenseIndexToRemove = oldModeArray.findIndex(
          (exp) => exp._id.toString() === expenseId
        );
        if (expenseIndexToRemove !== -1) {
          oldModeArray.splice(expenseIndexToRemove, 1); // Remove the expense by expenseId
        }
      }

      // Update mode and move it to the correct mode array
      expenseToUpdate.mode = mode;

      // Add the expense to the new mode array (Online or Offline)
      const newModeArray =
        mode === "Online" ? expenseDateObj.online : expenseDateObj.offline;
      newModeArray.push(expenseToUpdate); // Add to the new mode array
    }

    // 3. Both the date and the mode change
    else if (
      expenseToUpdate.date !== expenseDate &&
      expenseToUpdate.mode !== mode
    ) {
      // Remove the expense from the old date's mode array by expenseId
      const oldExpenseDateObj = userExpenses.expenses.find(
        (exp) => exp.date === expenseDate
      );
      if (oldExpenseDateObj) {
        const oldModeArray =
          expenseToUpdate.mode === "Online"
            ? oldExpenseDateObj.online
            : oldExpenseDateObj.offline;
        const expenseIndexToRemove = oldModeArray.findIndex(
          (exp) => exp._id.toString() === expenseId
        );
        if (expenseIndexToRemove !== -1) {
          oldModeArray.splice(expenseIndexToRemove, 1); // Remove the expense by expenseId
        }
      }

      // Update the expense with the new date and mode
      expenseToUpdate.mode = mode;

      // Add the updated expense to the new date object (create if necessary)
      let newExpenseDateObj = userExpenses.expenses.find(
        (exp) => exp.date === expenseToUpdate.date
      );

      if (!newExpenseDateObj) {
        newExpenseDateObj = {
          date: expenseToUpdate.date,
          online: [],
          offline: [],
        };
        userExpenses.expenses.push(newExpenseDateObj);
      }

      // Add the expense to the new mode array (Online or Offline)
      if (expenseToUpdate.mode === "Online") {
        newExpenseDateObj.online.push(expenseToUpdate);
      } else {
        newExpenseDateObj.offline.push(expenseToUpdate);
      }
    }

    // Save the updated user expenses
    await userExpenses.save();
    res.status(200).json({
      message: "Expense updated successfully.",
      updatedExpense: expenseToUpdate,
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Error updating expense", error });
  }
};

// delete the perticulate expense from user expense collection
/*{
  "expenseId": "677a93ffcaea2c265d0b0444",  // The ID of the expense to delete
  "mode": "Online"                           // Mode of the expense (Online or Offline)
}
 */
export const deleteUserExpense = (userDbConnection) => async (req, res) => {
  const { userId, expenseDate } = req.params;
  const { expenseId, mode } = req.body;

  try {
    const UserExpenseModel = UserExpense(userDbConnection);
    const userExpenses = await UserExpenseModel.findOne({ userId });

    if (!userExpenses) {
      return res.status(404).json({ message: "User expenses not found." });
    }

    // Find the expense date object to delete from
    const expenseDateObj = userExpenses.expenses.find(
      (exp) => exp.date === expenseDate
    );

    if (!expenseDateObj) {
      return res.status(404).json({ message: "Expense date not found." });
    }

    // Filter the expenses by mode
    const currentModeArray = mode
      ? expenseDateObj[mode.toLowerCase()] // "online" or "offline"
      : [...expenseDateObj.online, ...expenseDateObj.offline]; // Combine both if no mode is specified

    // Find the expense index to remove
    const expenseIndex = currentModeArray.findIndex(
      (exp) => exp._id.toString() === expenseId
    );

    if (expenseIndex === -1) {
      return res.status(404).json({ message: "Expense not found." });
    }

    // Remove the expense from the selected mode array
    if (mode === "Online") {
      expenseDateObj.online.splice(expenseIndex, 1);
    } else if (mode === "Offline") {
      expenseDateObj.offline.splice(expenseIndex, 1);
    }

    // Save the updated user expenses
    await userExpenses.save();

    res.status(200).json({
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Error deleting expense", error });
  }
};
