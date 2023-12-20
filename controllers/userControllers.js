//========> Register a new user
// POST : api/users/register
// unprotected route

const HttpError = require("../models/errorModel");
const { userModel } = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

require("dotenv").config();

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;
    if (!name || !email || !password) {
      return next(new HttpError("Fill in all fields.", 422));
    }
    const newEmail = email.toLowerCase();
    const emailExists = await userModel.findOne({ email: newEmail });

    if (emailExists) {
      return next(new HttpError("Email already exists.", 422));
    }

    if (password.trim().length < 6) {
      return next(
        new HttpError("Password must be at least 6 characters.", 422)
      );
    }

    if (password !== password2) {
      return next(new HttpError("Passwords do not match.", 422));
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({
      name,
      email: newEmail,
      password: hashedPass,
    });
    res
      .status(201)
      .json(`New user ${(newUser, email)} registered successfully`);
  } catch (error) {
    return next(new HttpError("User registration failed", 422));
  }
};

//========> Login a  Registered user
// POST : api/users/login
// unprotected route

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError("Fill in all fields.", 422));
    }
    const newEmail = email.toLowerCase();

    const user = await userModel.findOne({ email: newEmail });
    if (!user) {
      return next(new HttpError("User does not exist.", 422));
    }
    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      return next(new HttpError("Incorrect password", 422));
    }
    const { _id: id, name } = user;
    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({ Token: token, ID: id, Name: name });
  } catch (error) {
    return next(new HttpError("Login failed. Please check your password", 422));
  }
};

//========>user profile
// POST : api/users/:id
// protected route

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id).select("-password");
    if (!user) {
      return next(new HttpError("User does not exist.", 422));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError(error, 422));
  }
};

//========> Change user avatar(Profile picture)
// POST : api/users/change-avatar
// protected route

const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files.avatar) {
      return next(new HttpError("Please upload an image", 422));
    }

    // Finding the user from the database
    const user = await userModel.findById(req.user.id);

    // Deleting the old avatar if already exists
    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", user.avatar), (err) => {
        if (err) {
          return next(new HttpError(err, 422));
        }
      });
    }
    const { avatar } = req.files;

    // Check file size and type
    if (avatar.size > 500000) {
      return next(
        new HttpError("File size is too large. Should be less than 500kb", 422)
      );
    }
    let fileName;
    fileName = avatar.name;
    let splitFileName = fileName.split(".");
    let newFileName =
      splitFileName[0] + uuid() + "." + splitFileName[splitFileName.length - 1];
    avatar.mv(path.join(__dirname, "..", "uploads", newFileName), async () => {
      if (err) {
        return next(new HttpError(err, 422));
      }
      const updatedAvatar = await userModel.findByIdAndUpdate(
        req.user.id,
        { avatar: newFileName },
        { new: true }
      );
      if (!updatedAvatar) {
        return next(
          new HttpError("Something went wrong. Please try again", 422)
        );
      }
      res.status(200).json(updatedAvatar);
    });
  } catch (error) {
    return next(new HttpError(error, 422));
  }
};

//========> Edit user details (from profile page)
// POST : api/users/edit-user
// protected route

const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, confirmPassword } =
      req.body;
    if (
      !name ||
      !email ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return next(new HttpError("Fill in all fields", 422));
    }
    // get user from data base

    const user = await userModel.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User does not exist.", 403));
    }

    // Make sure new Emails doesNot exist
    const emailExist = await userModel.findOne({ email });
    if (emailExist && emailExist._id !== req.user.id) {
      return next(new HttpError("Email already exists", 422));
    }
    // compare current password
    const validUserPassword = await bcrypt.compare(newPassword, user.password);
    if (validUserPassword) {
      return next(
        new HttpError(
          "You can not use your old password. Create a new one",
          422
        )
      );
    }
    // compare new password
    if (newPassword !== confirmPassword) {
      return next(new HttpError("Passwords does not matching. Try again", 422));
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hashedPassword },
      { new: true }
    );
    res.status(200).json(updatedUser);

    // For handling the error part
  } catch (error) {
    return next(new HttpError(error, 422));
  }
};

//========> get user
// POST : api/users/authors
// Unprotected route

const getAuthors = async (req, res, next) => {
  try {
    const authors = await userModel.find().select("-password");
    res.json(authors);
  } catch (error) {
    return next(new HttpError(error, 422));
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  changeAvatar,
  editUser,
  getAuthors,
};
