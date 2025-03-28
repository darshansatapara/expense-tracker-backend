import mongoose from "mongoose";


//we can save the password credentials in the database using the user controller after the saving user details in users details database.
const UserCredentialSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      ref: "UserProfile", // Reference to the User model
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const UserCredential = (userDbConnection) => {
  return userDbConnection.model("UserCredential", UserCredentialSchema);
};

export default UserCredential;
