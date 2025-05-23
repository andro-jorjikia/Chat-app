import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

//-----------SIGN IN---------------//
export const signup = async (req, res) => {
     const { fullName, email, password } = req.body;
     try    { 2

          if(!fullName || !email || !password) {
               return res.status(400).json({ message: "All fields are required" });
          }

          if (password.length < 6) { 
               return res.status(400).json({ message: "Password must be at least 6 characters" });
          }

          const user = await User.findOne({email})
          if  (user) return res.status(400).json({ message: "Email already exists" });

          const salt = await bcrypt.genSalt(10)
          const hashedPassword = await bcrypt.hash(password,salt);

          const newUser = new User ({ 
               fullName,
               email, 
               password: hashedPassword
               
          })
          
          if(newUser)  {
               
               await newUser.save();
               generateToken(newUser._id,res);

               res.status(201).json({
                    _id: newUser._id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    profilePic: newUser.profilePic || "",
               })
               
          } else { 
               res.status(400).json({ message: "Invalid user Data" });
          }


     } catch (error) { 
          console.log("Error in signup controller", error.message);
          res.status(500).json({ Message: "Internal Server Error" });
     }
};

//----------LOG IN----------------//
export const login = async (req, res) => { 
     const { email, password } = req.body
    try{ 
     const user = await User.findOne({email})

     if(!user) { 
          return res.status(400).json({message: "Invalid credentials"});
     } 
     const isPasswordCorrect = await bcrypt.compare(password, user.password);
     if  (!isPasswordCorrect) { 
          return res.status(400).json({ message: "Invalid credentials" });
     }
     generateToken(user._id,res)

     res.status(200).json ({
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          profilePic: user.profilePic,
     });

    }catch ( error ) { 
     console.log("Error in login controller", error.message);
     res.status(500).json({ message: "Internal Server Error" });

    }
};
//------------LOG OUT--------------//
export const logout = (req, res) => { 
     try { 
          res.cookies("jwt", "", {maxAGE:0})
          res.status(200).json({ message: "Logged out succssfully" });
     }catch (error) { 
          res.status(500).json({ message: "Internal Server Error" });
     }
};
//--------UPDATE PROFILE------------------//
export const updateProfile = async(req,res) => { 
  try { 
     const {profilePic} = req.body;
     const userId = req.user._id;

     if(!profilePic){ 
          return res.status(400).json({ message: "Profile pic is required" });

     }

     const uploadResponse = await cloudinary.uploader.upload(profilePic)
     const upDatedUser = await User.findByIdAndUpdate(userId, {profilePic:uploadResponse.secure_url}, {new:true})
     
     res.status(200).json(upDatedUser);

  } catch(error) { 
     console.log("Error is update User");
     res.status(500).json({ message: "Internal Server Error" });


  } 
};
//----------CHECK AUTH----------------//
export const checkAuth = async(req,res) => { 
 try{ 
     res.status(200).json(req.user);
 }catch (error) { 
     console.log("Error in checkAuth controller", error.message);
     res.status(500).json({ message: "Internal Server Error" }); 
 }
};