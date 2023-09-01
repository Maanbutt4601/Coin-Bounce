const express = require('express');
const dbConnect = require('./Database/index');
const { port } = require('./config/index');
const router = require('./routes/index');
const errorHandler = require('./middlewares/errorHandler');
const cookieParser = require('cookie-parser');

const app = express();

/* A-CONNECTIO TO DATABASE */
dbConnect();

/* E-COOKIE-PARSER */
app.use(cookieParser())

/* B-TO COMMUNICATE DATA */
app.use(express.json());

/* B-ROUTES */
app.use(router);

/* F-USING STORAGE MIDDLEWARE TO ACCESS IMAGES */
app.use('/storage',express.static('storage'));

/* C-MIDDLEWARES */
app.use(errorHandler);

/* D-SERVER */
app.listen(port, () => {
    console.log(`Server is running on ${port}`);
})