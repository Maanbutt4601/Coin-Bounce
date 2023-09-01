const Joi = require('joi');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const UserDTO = require('../dto/user');
const JWTService = require('../services/JWTService');
const RefreshToken = require('../models/token');

/* 
At least 8 characters
At least one uppercase letter
At least one lowercase letter
At least one digit 
*/
const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,30}$/;

const authController = {

    /* ----- A-REGISTER USER LOGIC ----- */

    /*  OUTLINES:
        1. Validation User Input
        2. Email & Password => Already Registered => Return an error
        3. Validation Error => Error handling
        4. Hashing Password Using Bcrypt
        5. Storing user data
        6. Send response
    */

    async register(req, res, next) {

        /* 1.1 => Validating User Input */
        const userRegisterSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            name: Joi.string().max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().pattern(passwordPattern).required(),
            confirmPassword: Joi.ref('password')
        });

        // 1.1.1 => Destructuring Error & null here is to ensure that error does not give undefine when no error occured in validation.
        const { error = null } = userRegisterSchema.validate(req.body);

        /* 1.2 => If error in validation => return error via middleware */
        if (error) {
            return next(error);
        }

        /* 1.3 => if email or username is already registered =>  return an error */
        const { username, name, email, password } = req.body;

        try {
            const usernameInUse = await User.exists({ username });
            const emailInUse = await User.exists({ email });

            if (usernameInUse && emailInUse) {
                const error = {
                    status: 409, // conflict
                    message: "Username & Email address already registered , please choose another username and email!"
                }
                return next(error);
            }

            if (emailInUse) {
                const error = {
                    status: 409, // conflict
                    message: "Email already exists , please choose another email!"
                }
                return next(error);
            }

            if (usernameInUse) {
                const error = {
                    status: 409, // conflict
                    message: "Username already exists , please choose another username!"
                }
                return next(error);
            }

        }
        catch (error) {
            return next(error);
        }

        /* 1.4 => Bcrypt Hash Password */

        // 1.4.1 => bcrypt.hash(password, 10): This is the core operation. It's calling the hash function from the bcrypt library, which takes two parameters:password: This is the password that you want to hash. It's the original password entered by the user.
        // 1.4.2 => 10: This is called the "salt" or "cost" factor. It's a number that represents how much work should be done to hash the password. Higher values make the hashing process slower and more secure against brute-force attacks. Usually, the value is around 10 in this context.
        const hashedPassword = await bcrypt.hash(password, 10);

        /* 1.5 => Store user data in db */
        let accessToken;
        let refreshToken;
        let user;
        try {

            const usertoRegister = new User({

                // 1.5.1 => If both key and values are same then we can write them as below.
                username,
                email,
                name,
                password: hashedPassword
            });
            user = await usertoRegister.save();

            /* 1.5.2 => Token Generation */
            // 1.5.3 => Token That has been defined in JWTService
            accessToken = JWTService.signAccessToken({ _id: user._id }, '30m');
            refreshToken = JWTService.signRefreshToken({ _id: user._id }, '60m');
        }
        catch (error) {
            return next(error);
        };

        /* 1.7 => Storing refreshToken in Database */
        await JWTService.storeRefreshToken(refreshToken, user._id);

        /* 1.8 => Sending tokens in Cookies */
        // 1.8.1 => httpOnly: true => For Security Purposes. Vulnerability of XSS attacks will be reduced also.
        res.cookie('accessToken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24, // One day
            httpOnly: true
        })

        res.cookie('refreshToken', refreshToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
        })

        /* 1.6 => response to send */
        // res.status(201).json({user:user});
        const userDTO = new UserDTO(user); // Passed this "user = await User.findOne({ username });" user to DTO
        return res.status(201).json({ user: userDTO, auth: true }); // Here DTO will prevent the extra data leak
    },

    /* ----- B-LOGIN USER LOGIC ----- */

    async login(req, res, next) {

        /* OUTLINES:
        1. Validate User Input
        4. NO Error => Match Password and Username
        3. Validate User Input Error => Return Error Through Error Handling
        4. Return Response
        */

        /* 2.1 => Validating User Input */
        // 2.1.1 => null => here is to ensure that error does not give undefine when no error occured in validation
        const userLoginSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            password: Joi.string().pattern(passwordPattern).required(),
        });
        // 2.1.2 => Destructuring Error
        const { error = null } = userLoginSchema.validate(req.body);

        if (error) {
            return next(error);
        }

        // Will use this for validations.
        const { username, password } = req.body;

        let user;
        try {
            /* 2.2 => Match Username and Password */

            // * const user = await User.findOne({username:username});
            user = await User.findOne({ username });

            // 2.2.1 => req.body.password => hash => match
            // 2.2.2 => ?. => "Optional Chaining" operator, introduced in ECMAScript 2020 (ES11) to avoid error
            // 2.2.3 => If user is null or undefined, using just user.password would result in a runtime error.

            // 2.2.4 => Match Username
            if (!user) {
                const error = {
                    status: 401,
                    message: "Invalid Username"
                }
                return next(error);
            };

            // 2.2.5 => Match Password
            /* 
            1. user?.password: This part accesses the password property of the user object. The ?. is called the "optional chaining" operator. It checks if the user object exists and has a password property. If user is null or undefined, this part will result in undefined.
            2. || '': The || operator is the logical OR operator. It's used here to provide a fallback value in case the left-hand side is falsy (in this case, undefined). So, if user?.password is undefined, the fallback value of an empty string '' will be used.
            */
            const match = await bcrypt.compare(password, user?.password || '');
            if (!match) {
                const error = {
                    status: 401,
                    message: " Invalid Password "
                }
                return next(error);
            }
        }

        /* 2.3. Validate User Input Error => Return Error Through Error Handling */
        catch (error) {
            return next(error);
        }

        /* 2.6 => Token Generation */
        // 2.6.1 => Keep Payload as concise as you can. We can get all data through userid.
        const accessToken = JWTService.signAccessToken({ _id: user._id }, '30m')
        const refreshToken = JWTService.signRefreshToken({ id: user._id }, '60m')

        /* 2.7 => Update Refresh Token In Database */
        try {
            await RefreshToken.updateOne(
                { _id: user._id },
                { token: refreshToken },
                { upsert: true }
            )
        }
        catch (error) {
            return next(error);
        }

        // 2.5 => Sending Tokens in Cookies

        res.cookie('accessToken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
        })

        res.cookie('refreshToken', refreshToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true
        })

        /* 2.4 => Return Response */
        //  2.4.1 => This user "{user:user}" will return a complete object in response.
        // return res.status(200).json({user:user});
        const userDTO = new UserDTO(user); // Passed this "user = await User.findOne({ username });" user to DTO
        return res.status(200).json({ user: userDTO, auth: true }); // Here DTO will prevent the extra data leak
    },

    /* ----- C-LOGOUT USER LOGIC ----- */

    async logout(req, res, next) {
        console.log(req)
        /* 
        1. Delete refresh token from database
        2. Clearing Cookies
        3. Response
        */

        /* 3.1 => Delete refresh token from database */
        const { refreshToken } = req.cookies;

        try {
            await RefreshToken.deleteOne({ token: refreshToken }); // 3.1.1 => Matching with token in models.
        } catch (error) {
            return next(error);
        }

        /* 3.2 => Clearing Cookies */
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        /* 3.3 => Response */
        res.status(200).json({ user: null, auth: false });
    },

    /* ----- D-REFRESH CONTROLLER ----- */

    async refresh(req, res, next) {

        /* 
            1- Get Refresh Token From Cookies
            2- Verify Refresh Token
            3- Generate New Token
            4- Update DB
            5- Return Response
        */

        /* 4.1 => Getting Refresh Token From Cookies */
        const originalRefreshToken = req.cookies.refreshToken;

        /* 4.2 => Verify Refresh Token */
        let id;
        let decodedForm;
        try {
            decodedForm = JWTService.verifyRefreshToken(originalRefreshToken);
            id = decodedForm._id;
        } catch (e) {
            const error = {
                status: 401,
                message: 'Unauthorized'
            }
            return next(error);
        }

        try {
            const match = RefreshToken.findOne({ _id: id, token: originalRefreshToken });

            if (!match) {
                const error = {
                    status: 401,
                    message: 'Unauthorized'
                };
                return next(error);
            }
        } catch (e) {
            return next(e);
        }

        /* 4.3 => Generate New Token */

        try {
            const accessToken = JWTService.signAccessToken({ _id: id }, '30m');
            const refreshToken = JWTService.signRefreshToken({ _id: id }, '60m');

            /* 4.4 => Update DB */
            await RefreshToken.updateOne({ _id: id }, { token: refreshToken });

            res.cookie('accessToken', accessToken, {
                maxAge: 1000 * 60 * 60 * 24,
                httpOnly: true
            })

            res.cookie('refreshToken', refreshToken, {
                maxAge: 1000 * 60 * 60 * 24,
                httpOnly: true
            });
        }
        catch (e) {
            return next(e);
        }

        const user = await User.findOne({ _id: id });
        // const user = await User.findOne({ _id: id });
        console.log("User found:", user); // Check if user is null or an actual user object
        
        /* 4.5 => Return Response */
        const userDTO = new UserDTO(user);
        res.status(200).json({ user: userDTO, auth: true });
    }

};



module.exports = authController;