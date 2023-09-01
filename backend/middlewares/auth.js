const JWTService = require('../services/JWTService');
const User = require('../models/user');
const UserDTO = require('../dto/user');

/* ----- A-LOGOUT AUTHENTICATION ----- */
const auth = async (req, res, next) => {

    /* 
        1. Retrieve Tokens from Cookies
        2. Check Token Existence
        3. Verify Access Token
        4. Find User by ID
        5. Create UserDTO
        6. Attach User to Request Object
        7. Proceed to Next Middleware/Route
        8. Error Handling
    */

    try {
        /* 1.1 => Retrieving Tokens from Cookies */
        const { refreshToken, accessToken } = req.cookies;

        /* 1.2 => Check Token Existence */
        if (!refreshToken || !accessToken) {
            const error = {
                status: 401,
                message: 'Unauthorized'
            }
            return next(error);
        }

        /* 1.3 => Verifying Access Token */ 
        // 1.3.1 => Will return payload from services.
        let _id;
        try {
            _id = JWTService.verifyAccessToken(accessToken);
            
        } catch (error) {
            return next(error);
        };

        /* 1.4 => Finding a User by ID */
        let user;
        try {
            user = await User.findOne({ _id: _id })
        } catch (error) {
            return next(error);
        }

        /* 1.5 => Creating UserDTO (User's Data Transfer Object */
        const userDTO = new UserDTO(user);

        /* 1.6 => Attaching User to Request Object */
        req.user = userDTO;

        /* 1.7 => Proceeding to Next Middleware/Route */
        next(); 
    }
    catch (error) {
        return next(error);
    }
}
module.exports = auth;


