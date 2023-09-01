const { ValidationError } = require('joi');

/* ----- A-ERROR HANDLING MIDDLEWARE ----- */

/* 
    1▪ Default Error Setup
    2▪ Validation Error Handling
    3▪ Custom Status Handling
    4▪ Custom Message Handling
    5▪ Sending Error Response                                 
*/

const errorHandler = (error, req, res, next) => {
    /* 1.1 => Default Error */
    let status = 500;
    let data = {
        message: "Internal Server Error"
    };

    /* 1.2 => "instanceof" will tell us the type of object of error we are getting,is validation error or not. */ 
    if (error instanceof ValidationError) {
        status = 401; // 1.2.1 => Unauthorized access
        data.message = error.message;
        res.status(status).json(data);
    };

    /* 1.3 => Check if the error object has a status property => Updates the status variable accordingly. */
    if(error.status){
        status = error.status;
    };

    /* 1.4 => Check if there's a message property in the error object => Updates the message in the data object. */
    if(error.message){
        data.message = error.message;
    };

    /* 1.5 => Sending Error Response */
    return res.status(status).json(data);
};

module.exports = errorHandler;