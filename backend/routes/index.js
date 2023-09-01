const express = require('express');
const authController = require('../controllers/authController');
const blogController = require('../controllers/blogController')
const commentController = require('../controllers/commentController')
const auth = require('../middlewares/auth');
const router = express.Router();

/* ----- A-USER END POINTS ----- */

/* 1. REGISTER ROUTE */
router.post('/register', authController.register);

/* 2. LOGIN ROUTE */
router.post('/login', authController.login);

/* 3. LOGOUT ROUTE */
router.post('/logout', auth, authController.logout);

/* 4. REFRESH ROUTE */
router.get('/refresh', authController.refresh);

/* ----- B-BLOG END POINTS ----- */

/* 1. CREATE BLOG */
router.post('/blog', auth, blogController.create);

/* 2. GET ALL BLOG */
router.get('/blog/all', auth, blogController.getAll);

/* 3. GET BLOG BY ID */
router.get('/blog/:id', auth, blogController.getById);

/* 4. UPDATE BLOG */
router.put('/blog', auth, blogController.updateBlog);

/* 5. DELETE BLOG */
router.delete('/blog/:id', auth, blogController.deleteBlog);

/* ----- C-COMMENTS END POINTS ----- */

/* 1. CREATE COMMENT */
router.post('/comment', auth, commentController.create);
/* 2. GET COMMENT */
router.get('/comment/:id', auth, commentController.getById);

module.exports = router;

