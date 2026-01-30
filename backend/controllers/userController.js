const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');



let signup = (req, res) => {
    console.log("Signup user controller called with data:", req.body);
    
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).send({ message: "All fields are required." });
    }
  
    User.findOne({ email: req.body.email })
      .then(existingUser => {
        if (existingUser) {
          return res.status(400).send({ message: "User account with this email already exists!" });
        }
  
        bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
          if (err) {
            return res.status(500).send({ message: "Error hashing password", error: err });
          }
  
          const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
          });
  
          newUser.save()
            .then(user => {
              console.log("User registered successfully:", user);
              res.status(200).send({ message: "User account created successfully!", user });
            })
            .catch(err => {
              res.status(400).send({ message: "Error occurred while creating user account", error: err });
            });
        });
      })
      .catch(err => {
        res.status(400).send({ message: "Error occurred while checking user account", error: err });
      });
  };
  

let login = (req, res) => {
    console.log("login usercontroller called!");
    User.findOne({ email: req.body.email })
        .then(user => {
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }

            bcrypt.compare(req.body.password, user.password, (err, isMatch) => {
                if (err) {
                    return res.status(500).send({ message: "Error verifying password", error: err });
                }
                if (!isMatch) {
                    return res.status(401).send({ message: "Invalid credentials" });
                }

                const token = jwt.sign(
                    { id: user._id, email: user.email, role: user.role },
                    process.env.SECRET_KEY,
                    { expiresIn: '10h' }
                );

                res.status(200).send({
                    message: "Login successful",
                    token,
                    user: {
                        id: user._id,
                        username: user.username,  // Updated here too
                        email: user.email,
                    }
                    
                });
            console.log("token!", token);
            });
        })
        .catch(err => {
            res.status(500).send({ message: "Error during login", error: err });
        });
}; 

let getUserProfile = (req, res) => {
    User.findById(req.user.id)
        .then(user => {
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }
            res.status(200).send({
                id: user._id,
                username: user.username,
                email: user.email,
            });
        })
        .catch(err => {
            res.status(500).send({ message: "Error fetching user profile", error: err });
        });
};


let updateUserProfile = (req, res) => {
    const { username, email } = req.body;

    User.findById(req.user.id)
        .then(user => {
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }


            user.username = username || user.username;
            user.email = email || user.email;

            return user.save();
        })
        .then(updatedUser => {
            res.status(200).send({ message: "User profile updated successfully!", user: updatedUser });
        })
        .catch(err => {
            res.status(500).send({ message: "Error updating user profile", error: err });
        });
};

module.exports = {
    signup,
    login,
    getUserProfile,
    updateUserProfile,
}