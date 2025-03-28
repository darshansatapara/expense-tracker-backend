import mongoose from "mongoose";

// Define the income schema for individual income entries
const incomeSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  mode: { type: String, enum: ["Online", "Offline"], required: true },
  amount: { type: String, required: true },
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdminCurrencyCategory",
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "AdminIncomeCategory",
  },
  note: { type: String, required: false },
});

// Define the user income schema to group incomes by userId
const userIncomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserProfile",
    required: true,
  },
  incomes: [
    {
      date: { type: String, required: true },
      online: [incomeSchema], // Array of income entries for Online mode
      offline: [incomeSchema], // Array of income entries for Offline mode
    },
  ],
});

// Create the UserIncome model

const UserIncome = (userDbConnection) => {
  return userDbConnection.model("UserIncomeData", userIncomeSchema);
};
export default UserIncome;
