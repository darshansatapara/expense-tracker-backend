import dayjs from "dayjs";
import {
  AdminCurrencyCategory,
  AdminIncomeCategory,
} from "../../models/AdminModel/AdminCategoryModels.js";
import UserIncome from "../../models/UserModel/UserIncomeDataModel.js";
import isBetween from "dayjs"; // Import the plugin
import { userExpenseAmountCurrencyConverter } from "../../middlewares/userExpenseAmountCurrencyConverter.js";
import { UserCurrencyAndBudgetModel } from "../../models/UserModel/UserCategoryModels.js";

dayjs.extend(isBetween);
// Controller for adding income
export const addUserIncome = (userDbConnection) => async (req, res) => {
  const { userId } = req.params;
  const { date, mode, amount, category, currency, note } = req.body;

  if (!userId || !date || !mode || !amount || !category || !currency) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: userId, date, mode, amount, category, currency are mandatory.",
    });
  }

  try {
    const UserIncomeModel = UserIncome(userDbConnection);
    // const formattedDate = dayjs(date, "DD-MM-YYYY").format("DD-MM-YYYY");
    // Find user incomes for the given userId
    let userIncome = await UserIncomeModel.findOne({ userId });

    // Build the income object
    const newIncome = {
      date,
      mode,
      amount,
      category,
      currency,
      note,
    };

    if (!userIncome) {
      // Create a new user income document if none exists
      userIncome = new UserIncomeModel({
        userId,
        incomes: [
          {
            date: date,
            online: mode === "Online" ? [newIncome] : [],
            offline: mode === "Offline" ? [newIncome] : [],
          },
        ],
      });
    } else {
      // Check if an income entry for the given date exists
      let incomeForDate = userIncome.incomes.find(
        (income) => income.date === date
      );

      if (incomeForDate) {
        // Add to the existing online/offline array
        if (mode === "Online") {
          incomeForDate.online.push(newIncome);
        } else {
          incomeForDate.offline.push(newIncome);
        }
      } else {
        // Create a new entry for this date
        userIncome.incomes.push({
          date: date,
          online: mode === "Online" ? [newIncome] : [],
          offline: mode === "Offline" ? [newIncome] : [],
        });
      }
    }

    // Save the updated or newly created document
    await userIncome.save();

    res.status(201).json({
      success: true,
      message: "Income added successfully.",
      data: userIncome,
    });
  } catch (error) {
    console.error("Error adding income:", error);
    res.status(500).json({
      success: false,
      message: "Error adding income.",
      error: error.message,
    });
  }
};

// Controller for get incomes as per date range
// export const getUserIncome =
//   (userDbConnection, adminDbConnection) => async (req, res) => {
//     const { userId, startDate, endDate, professionId } = req.params;

//     try {
//       const UserIncomeModel = UserIncome(userDbConnection);
//       const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);

//       const formattedStartDate = new Date(
//         startDate.split("-").reverse().join("-")
//       ); // Convert "DD-MM-YYYY" to "YYYY-MM-DD"
//       formattedStartDate.setDate(formattedStartDate.getDate() + 1);

//       const formattedEndDate = new Date(endDate.split("-").reverse().join("-"));

//       // Step 1: Find the AdminIncomeCategory for the given profession
//       const professionCategory = await AdminIncomeCategoryModel.findOne({
//         _id: professionId,
//       });

//       if (!professionCategory) {
//         return res.status(404).json({
//           success: false,
//           message: `No active category found for profession: ${professionId}`,
//         });
//       }

//       // Step 2: Fetch user incomes
//       const userIncomes = await UserIncomeModel.findOne({ userId })
//         .populate({
//           path: "incomes.online.currency",
//           model: AdminCurrencyCategory(adminDbConnection),
//           select: "_id symbol", // Include _id and symbol
//         })
//         .populate({
//           path: "incomes.offline.currency",
//           model: AdminCurrencyCategory(adminDbConnection),
//           select: "_id symbol",
//         });

//       if (!userIncomes) {
//         return res.status(404).json({
//           success: false,
//           message: "No incomes found for this user.",
//         });
//       }

//       const filteredIncomes = [];
//       const subcategories = professionCategory.subcategories;

//       // Step 3: Filter incomes by date and map category names
//       userIncomes.incomes.forEach((incomeGroup) => {
//         const incomeDate = new Date(
//           incomeGroup.date.split("-").reverse().join("-")
//         );

//         if (
//           incomeDate >= formattedStartDate &&
//           incomeDate <= formattedEndDate
//         ) {
//           filteredIncomes.push({
//             date: incomeGroup.date,
//             online: incomeGroup.online.map((income) => ({
//               date: income.date,
//               mode: income.mode,
//               amount: income.amount,
//               currency: income.currency?._id
//                 ? { _id: income.currency._id, symbol: income.currency.symbol }
//                 : { _id: null, symbol: "Unknown" },
//               category: subcategories.find(
//                 (sub) => sub._id.toString() === income.category?.toString()
//               )
//                 ? {
//                     _id: income.category,
//                     name: subcategories.find(
//                       (sub) =>
//                         sub._id.toString() === income.category?.toString()
//                     )?.name,
//                   }
//                 : { _id: null, name: "Unknown" },
//               note: income.note,
//               _id: income._id,
//             })),
//             offline: incomeGroup.offline.map((income) => ({
//               date: income.date,
//               mode: income.mode,
//               amount: income.amount,
//               currency: income.currency?._id
//                 ? { _id: income.currency._id, symbol: income.currency.symbol }
//                 : { _id: null, symbol: "Unknown" },
//               category: subcategories.find(
//                 (sub) => sub._id.toString() === income.category?.toString()
//               )
//                 ? {
//                     _id: income.category,
//                     name: subcategories.find(
//                       (sub) =>
//                         sub._id.toString() === income.category?.toString()
//                     )?.name,
//                   }
//                 : { _id: null, name: "Unknown" },
//               note: income.note,
//               _id: income._id,
//             })),
//           });
//         }
//       });

//       if (!filteredIncomes.length) {
//         return res.status(404).json({
//           success: false,
//           message: "No incomes found for the specified date range.",
//         });
//       }

//       res.status(200).json({
//         success: true,
//         message: "Incomes retrieved successfully.",
//         incomes: filteredIncomes,
//       });
//     } catch (error) {
//       console.error("Error fetching incomes:", error);
//       res.status(500).json({
//         success: false,
//         message: "Error fetching incomes.",
//         error: error.message,
//       });
//     }
//   };

export const getUserIncome =
  (userDbConnection, adminDbConnection) => async (req, res) => {
    const { userId, startDate, endDate, professionId } = req.params;

    try {
      const UserIncomeModel = UserIncome(userDbConnection);
      const AdminIncomeCategoryModel = AdminIncomeCategory(adminDbConnection);
      const AdminCurrencyCategoryModel =
        AdminCurrencyCategory(adminDbConnection);
      const UserCurrencyAndBudget =
        UserCurrencyAndBudgetModel(userDbConnection);
      const formattedStartDate = new Date(
        startDate.split("-").reverse().join("-")
      ); // Convert "DD-MM-YYYY" to "YYYY-MM-DD"
      formattedStartDate.setDate(formattedStartDate.getDate() + 1);

      const formattedEndDate = new Date(endDate.split("-").reverse().join("-"));

      // Step 1: Find the AdminIncomeCategory for the given profession
      const professionCategory = await AdminIncomeCategoryModel.findOne({
        _id: professionId,
      });

      if (!professionCategory) {
        return res.status(404).json({
          success: false,
          message: `No active category found for profession: ${professionId}`,
        });
      }

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

      // Step 2: Fetch user incomes
      const userIncomes = await UserIncomeModel.findOne({ userId })
        .populate({
          path: "incomes.online.currency",
          model: AdminCurrencyCategory(adminDbConnection),
          select: "_id symbol",
        })
        .populate({
          path: "incomes.offline.currency",
          model: AdminCurrencyCategory(adminDbConnection),
          select: "_id symbol",
        });

      if (!userIncomes) {
        return res.status(404).json({
          success: false,
          message: "No incomes found for this user.",
        });
      }

      const filteredIncomes = [];
      const subcategories = professionCategory.subcategories;

      // Step 3: Filter incomes by date, convert currency, and map category names
      for (const incomeGroup of userIncomes.incomes) {
        const incomeDate = new Date(
          incomeGroup.date.split("-").reverse().join("-")
        );

        if (
          incomeDate >= formattedStartDate &&
          incomeDate <= formattedEndDate
        ) {
          filteredIncomes.push({
            date: incomeGroup.date,
            online: await Promise.all(
              incomeGroup.online.map(async (income) => {
                let convertedAmount = "Unavailable";

                if (
                  income.currency &&
                  defaultCurrencyId &&
                  income.currency._id.toString() !==
                    defaultCurrencyId.toString()
                ) {
                  convertedAmount = await userExpenseAmountCurrencyConverter(
                    adminDbConnection,
                    income.date,
                    income.amount,
                    income.currency._id,
                    defaultCurrencyId
                  );
                } else {
                  convertedAmount = parseFloat(income.amount).toFixed(2);
                }

                return {
                  date: income.date,
                  mode: income.mode,
                  amount: income.amount,
                  currency: income.currency
                    ? {
                        _id: income.currency._id,
                        symbol: income.currency.symbol,
                      }
                    : { _id: null, symbol: "Unknown" },
                  category: subcategories.find(
                    (sub) => sub._id.toString() === income.category?.toString()
                  )
                    ? {
                        _id: income.category,
                        name: subcategories.find(
                          (sub) =>
                            sub._id.toString() === income.category?.toString()
                        )?.name,
                      }
                    : { _id: null, name: "Unknown" },
                  convertedAmount,
                  note: income.note,
                  _id: income._id,
                };
              })
            ),
            offline: await Promise.all(
              incomeGroup.offline.map(async (income) => {
                let convertedAmount = "Unavailable";

                if (
                  income.currency &&
                  defaultCurrencyId &&
                  income.currency._id.toString() !==
                    defaultCurrencyId.toString()
                ) {
                  convertedAmount = await userExpenseAmountCurrencyConverter(
                    adminDbConnection,
                    income.date,
                    income.amount,
                    income.currency._id,
                    defaultCurrencyId
                  );
                } else {
                  convertedAmount = parseFloat(income.amount).toFixed(2);
                }

                return {
                  date: income.date,
                  mode: income.mode,
                  amount: income.amount,
                  currency: income.currency
                    ? {
                        _id: income.currency._id,
                        symbol: income.currency.symbol,
                      }
                    : { _id: null, symbol: "Unknown" },
                  category: subcategories.find(
                    (sub) => sub._id.toString() === income.category?.toString()
                  )
                    ? {
                        _id: income.category,
                        name: subcategories.find(
                          (sub) =>
                            sub._id.toString() === income.category?.toString()
                        )?.name,
                      }
                    : { _id: null, name: "Unknown" },
                  convertedAmount,
                  note: income.note,
                  _id: income._id,
                };
              })
            ),
          });
        }
      }

      if (!filteredIncomes.length) {
        return res.status(404).json({
          success: false,
          message: "No incomes found for the specified date range.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Incomes retrieved successfully.",
        incomes: filteredIncomes,
      });
    } catch (error) {
      console.error("Error fetching incomes:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching incomes.",
        error: error.message,
      });
    }
  };

/// update the user income based on the income and the date of the the income and income id
/*
  {
  "date": "05-01-2025",DD-MM-YYYY
  "mode": "Online",
  "amount": "100",
  "category": "6774e0884930e249cf39da96",
  "currency": "6774e1600ae028dfbf4f2c6a",
  "note": "Scholarships mine 2",
  "incomeId": "677d77cc531d8278ff44fe3a"
}
  */
export const updateUserIncome = (userDbConnection) => async (req, res) => {
  const { userId, incomeDate } = req.params;
  const { date, mode, amount, category, currency, note, incomeId } = req.body;

  try {
    const UserIncomeModel = UserIncome(userDbConnection);
    const userIncomes = await UserIncomeModel.findOne({ userId });

    if (!userIncomes) {
      return res.status(404).json({ message: "User incomes not found." });
    }

    // Find the income date object to update
    const incomeDateObj = userIncomes.incomes.find(
      (inc) => inc.date === incomeDate
    );

    if (!incomeDateObj) {
      return res.status(404).json({ message: "Income date not found." });
    }

    // Find the income to update (across online and offline)
    const currentModeArray = [
      ...incomeDateObj.online,
      ...incomeDateObj.offline,
    ];
    const incomeIndex = currentModeArray.findIndex(
      (inc) => inc._id.toString() === incomeId
    );

    if (incomeIndex === -1) {
      return res.status(404).json({ message: "Income not found." });
    }

    let incomeToUpdate = currentModeArray[incomeIndex];

    // Update the income fields with provided data
    incomeToUpdate.date = date ?? incomeToUpdate.date;
    incomeToUpdate.amount = amount ?? incomeToUpdate.amount;
    incomeToUpdate.currency = currency ?? incomeToUpdate.currency;
    incomeToUpdate.category = category ?? incomeToUpdate.category;
    incomeToUpdate.note = note ?? incomeToUpdate.note;

    // 1. Only the date changes, but mode remains the same
    if (incomeToUpdate.date !== incomeDate && incomeToUpdate.mode === mode) {
      // Remove the income from the old date's mode array by incomeId
      const oldIncomeDateObj = userIncomes.incomes.find(
        (inc) => inc.date === incomeDate
      );
      if (oldIncomeDateObj) {
        const oldModeArray =
          incomeToUpdate.mode === "Online"
            ? oldIncomeDateObj.online
            : oldIncomeDateObj.offline;
        const incomeIndexToRemove = oldModeArray.findIndex(
          (inc) => inc._id.toString() === incomeId
        );
        if (incomeIndexToRemove !== -1) {
          oldModeArray.splice(incomeIndexToRemove, 1); // Remove the income by incomeId
        }
      }

      // Create a new income date object if the updated date doesn't exist
      let newIncomeDateObj = userIncomes.incomes.find(
        (inc) => inc.date === incomeToUpdate.date
      );

      if (!newIncomeDateObj) {
        newIncomeDateObj = {
          date: incomeToUpdate.date,
          online: [],
          offline: [],
        };

        if (incomeToUpdate.mode === "Online") {
          newIncomeDateObj.online.push(incomeToUpdate);
        } else {
          newIncomeDateObj.offline.push(incomeToUpdate);
        }
        userIncomes.incomes.push(newIncomeDateObj);
      } // Push the new date object into the income array

      // Push the updated income data to the correct mode array
      if (incomeToUpdate.mode === "Online") {
        newIncomeDateObj.online.push(incomeToUpdate);
      } else {
        newIncomeDateObj.offline.push(incomeToUpdate);
      }
    }

    // 2. Only the mode changes, but date remains the same
    else if (
      incomeToUpdate.date === incomeDate &&
      incomeToUpdate.mode !== mode
    ) {
      // Remove the income from the old mode array by incomeId
      const oldIncomeDateObj = userIncomes.incomes.find(
        (inc) => inc.date === incomeDate
      );
      if (oldIncomeDateObj) {
        const oldModeArray =
          incomeToUpdate.mode === "Online"
            ? oldIncomeDateObj.online
            : oldIncomeDateObj.offline;
        const incomeIndexToRemove = oldModeArray.findIndex(
          (inc) => inc._id.toString() === incomeId
        );
        if (incomeIndexToRemove !== -1) {
          oldModeArray.splice(incomeIndexToRemove, 1); // Remove the income by incomeId
        }
      }

      // Update mode and move it to the correct mode array
      incomeToUpdate.mode = mode;

      // Add the income to the new mode array (Online or Offline)
      const newModeArray =
        mode === "Online" ? incomeDateObj.online : incomeDateObj.offline;
      newModeArray.push(incomeToUpdate); // Add to the new mode array
    }

    // 3. Both the date and the mode change
    else if (
      incomeToUpdate.date !== incomeDate &&
      incomeToUpdate.mode !== mode
    ) {
      // Remove the income from the old date's mode array by incomeId
      const oldIncomeDateObj = userIncomes.incomes.find(
        (inc) => inc.date === incomeDate
      );
      if (oldIncomeDateObj) {
        const oldModeArray =
          incomeToUpdate.mode === "Online"
            ? oldIncomeDateObj.online
            : oldIncomeDateObj.offline;
        const incomeIndexToRemove = oldModeArray.findIndex(
          (inc) => inc._id.toString() === incomeId
        );
        if (incomeIndexToRemove !== -1) {
          oldModeArray.splice(incomeIndexToRemove, 1); // Remove the income by incomeId
        }
      }

      // Update the income with the new date and mode
      incomeToUpdate.mode = mode;

      // Add the updated income to the new date object (create if necessary)
      let newIncomeDateObj = userIncomes.incomes.find(
        (inc) => inc.date === incomeToUpdate.date
      );

      if (!newIncomeDateObj) {
        newIncomeDateObj = {
          date: incomeToUpdate.date,
          online: [],
          offline: [],
        };

        if (incomeToUpdate.mode === "Online") {
          newIncomeDateObj.online.push(incomeToUpdate);
        } else {
          newIncomeDateObj.offline.push(incomeToUpdate);
        }
        userIncomes.incomes.push(newIncomeDateObj);
      } // Push the new date object into the income array

      // Add the income to the new mode array (Online or Offline)
      if (incomeToUpdate.mode === "Online") {
        newIncomeDateObj.online.push(incomeToUpdate);
      } else {
        newIncomeDateObj.offline.push(incomeToUpdate);
      }
    }

    // Save the updated user incomes
    await userIncomes.save();
    res.status(200).json({
      message: "Income updated successfully.",
      updatedIncome: incomeToUpdate,
    });
  } catch (error) {
    console.error("Error updating income:", error);
    res.status(500).json({ message: "Error updating income", error });
  }
};

// delete route for the delete perticular income for user
/* 
{
  "incomeId": "incomeIdHere",
  "mode": "Online"  // or "Offline"
}
 */
export const deleteUserIncome = (userDbConnection) => async (req, res) => {
  const { userId, incomeDate } = req.params; // Changed "date" to "incomeDate"
  const { incomeId, mode } = req.body;

  try {
    const UserIncomeModel = UserIncome(userDbConnection);
    const userIncomes = await UserIncomeModel.findOne({ userId });

    if (!userIncomes) {
      return res.status(404).json({ message: "User incomes not found." });
    }

    // Find the income date object to delete from
    const incomeDateObj = userIncomes.incomes.find(
      (inc) => inc.date === incomeDate
    );

    if (!incomeDateObj) {
      return res.status(404).json({ message: "Income date not found." });
    }

    // Filter the incomes by mode
    const currentModeArray = mode
      ? incomeDateObj[mode.toLowerCase()] // "online" or "offline"
      : [...incomeDateObj.online, ...incomeDateObj.offline]; // Combine both if no mode is specified

    // Find the income index to remove
    const incomeIndex = currentModeArray.findIndex(
      (inc) => inc._id.toString() === incomeId
    );

    if (incomeIndex === -1) {
      return res.status(404).json({ message: "Income not found." });
    }

    // Remove the income from the selected mode array
    if (mode === "Online") {
      incomeDateObj.online.splice(incomeIndex, 1);
    } else if (mode === "Offline") {
      incomeDateObj.offline.splice(incomeIndex, 1);
    }

    // If both online and offline are empty for this date, you can remove the entire date object
    if (
      incomeDateObj.online.length === 0 &&
      incomeDateObj.offline.length === 0
    ) {
      userIncomes.incomes = userIncomes.incomes.filter(
        (inc) => inc.date !== incomeDate
      );
    }

    // Save the updated user incomes
    await userIncomes.save();

    res.status(200).json({
      message: "Income deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting income:", error);
    res.status(500).json({ message: "Error deleting income", error });
  }
};
