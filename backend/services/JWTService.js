const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = require('../config/index');
const RefreshToken = require('../models/token');

class JWTService {
    /* 
        1. Sign Access Token
        2. Sign Refresh Token
        3. Verify Access Token
        4. Verify Access Token
        5. Store Refresh Token
    */

    /* ----- A-SIGN ACCESS TOKEN ----- */
    static signAccessToken(payload, expiryTime) {
        return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: expiryTime });
    };

    /* ----- B-SIGN REFRESH TOKEN ----- */
    static signRefreshToken(payload, expiryTime) {
        return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: expiryTime });
    };

    /* ----- C-VERIFY ACCESS TOKEN ----- */
    static verifyAccessToken(token) {
        return jwt.verify(token, ACCESS_TOKEN_SECRET);
    };

    /* ----- D-VERIFY REFRESH TOKEN ----- */
    static verifyRefreshToken(token) {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    };

    /* ----- E-STORE REFRESH TOKEN ----- */
    static async storeRefreshToken(token, userid) {
        try {
            const newToken = new RefreshToken({
                token: token,
                userid: userid
            });

            // 5.1 => Storing new token in database
            await newToken.save();

        } catch (error) {
            throw error;
        }
    };

};

module.exports = JWTService;