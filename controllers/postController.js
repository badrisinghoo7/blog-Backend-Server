//Post Controller here

const { postModel } = require("../models/postModel");
const { userModel } = require("../models/userModel");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const HttpError = require("../models/errorModel");

// ======> Create A post for user
//POST : api/posts
// Protected
const createPost = async (req, res, next) => {
  try {
    let { title, category, description } = req.body;
    if (!title || !category || !description) {
      return next(
        new HttpError(
          "All fields are required. Please filled all the feilds",
          400
        )
      );
    }
    const { thumbnail } = req.files;
    //checking the files thumbnails

    if (thumbnail.size > 2000000) {
      return next(
        new HttpError("File size is too large. Should be less than 2mb", 400)
      );
    }

    let fileName = thumbnail.name;
    let splitFileName = fileName.split(".");
    let newFileName =
      splitFileName[0] + uuid() + "." + splitFileName[splitFileName.length - 1];
    thumbnail.mv(
      path.join(__dirname, "..", "/uploads", newFileName),
      async (err) => {
        if (err) {
          return next(new HttpError(err, 400));
        } else {
          const newPost = await postModel.create({
            title,
            category,
            description,
            thumbnail: newFileName,
            creator: req.user.id,
          });
          if (!newPost) {
            return next(new HttpError("Post could not be created", 422));
          }
          // find user and increase count by 1
          const currentUser = await userModel.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await userModel.findByIdAndUpdate(req.user.id, {
            posts: userPostCount,
          });
          res.status(201).json(newPost);
        }
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ======> Get single Post
//GET : api/posts/:id
// UNprotected
const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await postModel.findById(postId);
    if (!post) {
      return next(new HttpError("Post does not exist", 402));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ======> Get All Post
//GET : api/posts/
// UNprotected
const getPosts = async (req, res, next) => {
  try {
    const posts = await postModel.find().sort({ updatedAt: -1 });
  } catch (error) {
    return next(new HttpError(error));
  }
};
// ======>Get posts by category
//GET : api/posts/category/:category
// Unprotected
const getCategoryPost = async (req, res, next) => {
  try {
    const { category } = req.params;
    const posts = await postModel.find({ category }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ======> Get users/Authors post
//GET : api/posts/user/:id
// Unprotected
const getUserPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const posts = await postModel.find({ creator: id }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ======> Edit post
//PATCH : api/posts/:id
// Protected
const editPost = async (req, res, next) => {
  try {
    let fileName;
    let newFilename;
    let updatedPost;
    const postId = req.params.id;
    let { title, category, description } = req.body;
    // React Quill has a paragraph opening and clossing tag with a break tag in between so there are 11 characters in between.
    if (!title || !category || !description.length < 12) {
      return next(
        new HttpError(
          "All fields are required. Please filled all the feilds",
          422
        )
      );
    }
    if (!req.files) {
      (updatedPost = await postModel.findByIdAndUpdate(postId, {
        title,
        category,
        description,
      })),
        { new: true };
    } else {
      //get old post from data base
      const oldPost = await postModel.findById(postId);

      // delete the old post thumbnail
      fs.unlink(
        path.join(__dirname, "..", "uploads", oldPost.thumbnail),
        async (err) => {
          if (err) {
            return next(new HttpError(err, 400));
          }
        }
      );
      // upload a new thumbnails
      const { thumbnail } = req.files;
      // checkin the file   size
      if (thumbnail.size > 2000000) {
        return next(new HttpError("File size too large", 400));
      }
      // upload the file and update the name of file
      fileName = thumbnail.name;
      splitFileName = fileName.split(".");
      newFilename =
        splitFileName[0] +
        uuid() +
        "." +
        splitFileName[splitFileName.length - 1];
      thumbnail.mv(
        path.join(__dirname, "..", "uploads", newFilename),
        async (err) => {
          if (err) {
            return next(new HttpError(err, 400));
          }
        }
      );
      updatedPost = await postModel.findByIdAndUpdate(
        postId,
        {
          title,
          category,
          description,
          thumbnail: newFilename,
        },
        {
          new: true,
        }
      );
    }
    if (!updatedPost) {
      return next(new HttpError("Could not update the post .", 422));
    }
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ======> Delete a post
//DELETE : api/posts/:id
// Protected
const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      return next(new HttpError("Post unavailable", 422));
    }
    const post = await postModel.findById(postId);
    const fileName = post?.thumbnail;
    if (req.user.id == post.creator) {
      // delete thumbnails from uploads folder
      fs.unlink(
        path.join(__dirname, "..", "uploads", fileName),
        async (err) => {
          if (err) {
            return next(new HttpError(err, 400));
          } else {
            await post.findByIdAndDelete(postId);
            //find user and reduce post count by 1

            const currentUser = await userModel.findById(post.user.id);
            const userPostCount = currentUser?.posts - 1;
            await userModel.findByIdAndUpdate(req.user.id, {
              post: userPostCount,
            });
            res.json(`Post ${postId} has been deleted successfully`);
          }
        }
      );
    } else {
      return next(
        new HttpError(
          "Post can not be deleted from here and you can not delete this post . Or you have to Authorised first",
          403
        )
      );
    }
  } catch (error) {
    return next(new HttpError(error));
  }
};

module.exports = {
  createPost,
  getPost,
  getPosts,
  getCategoryPost,
  getUserPost,
  editPost,
  deletePost,
};
