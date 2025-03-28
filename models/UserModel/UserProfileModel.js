import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
  profilePic: {
    type: String,
    required: false,
    default:
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobile_no: {
    type: String,
    required: true,
    unique: true,
  },
  date_of_birth: {
    type: Date,
    required: true,
  },
  profession: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "AdminIncomeCategory",
  },
  profile_complated: {
    type: Boolean,
    default: false,
  },
  category_completed: {
    type: Boolean,
    default: false,
  },
});

// Export model for the specific connection
const UserProfile = (userDbConnection) => {
  return userDbConnection.model("UserProfile", userProfileSchema);
};

export default UserProfile;
