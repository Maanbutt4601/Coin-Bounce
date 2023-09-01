const Joi = require('joi');
const fs = require('fs');
const Blog = require('../models/blogs');
const { BACKEND_SERVER_PATH } = require('../config/index');
const BlogDTO = require('../dto/blog');
const BlogDetailsDTO = require('../dto/blog-details');
const comment = require('../models/coments');

const mongodbIDPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {

    /* ----- A- CREATE BLOG LOGIC ----- */

    async create(req, res, next) {

        /* OUTLINES:
            1. Validate req body
            2. Handle photo storage, naming
            3. Add to db
            4. return response
        */

        /* 1.1 => Validating Blog Input */
        // 1.1.1 => Photo will come from the client side in "base64 encoded string form" but it will be decoded in backend and will be stored in server's side and then we will save the photo's path in database.
        const createBlogSchema = Joi.object({
            title: Joi.string().required(),
            author: Joi.string().regex(mongodbIDPattern).required(),
            content: Joi.string().required(),
            photo: Joi.string().required()
        });

        const { error = null } = createBlogSchema.validate(req.body);

        if (error) {
            return next(error);
        };

        const { title, author, content, photo } = req.body;

        /* 1.2 => Handling Photo Storage */

        /* ----- 1. Read as Buffer ----- */

        // 1.1 => /^data:image\/(png|jpg|jpeg);base64,/
        // 1.2 => /^: Anchors the match to the start of the string.
        // 1.3 => data:image\/: Matches the literal text "data:image/" that signals a Data URI.
        // 1.4 => (png|jpg|jpeg): Captures the allowed image formats (png, jpg, or jpeg).
        // 1.5 => ;base64,: Matches the base64 indicator in the Data URI.
        // 1.6 => At last cleaning base64 data into a Buffer object, specifying the 'base64' encoding.We can handle streams of binary data through buffer.
        const base64PrefixPattern = /^data:image\/(png|jpg|jpeg);base64,/;

        // 1.7 => 'photo' holds a base64 encoded image string.
        // 1.8 => Use 'replace' to remove the Data URI ("data:image/") prefix using the defined regex.The purpose of ,'' is to replace the matched Data URI prefix with nothing, effectively removing it from the photo string.
        // 1.9 => This leaves only the raw base64 encoded image data.
        const cleanedBase64 = photo.replace(base64PrefixPattern, '');

        // 1.10 => Convert the cleaned base64 data into a Buffer object with 'base64' encoding.
        // const buffer = Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''), 'base64');
        const buffer = Buffer.from(cleanedBase64, 'base64');

        /* ----- 2. Allot a Random Name ----- */
        const imagePath = `${Date.now()}-${author}.png`

        /* ----- 3. Save Locally ----- */
        try {
            fs.writeFileSync(`storage/${imagePath}`, buffer)
        } catch (error) {
            return next(error);
        }


        /* 1.3 => Save blog To Database */
        let newBlog
        try {
            newBlog = new Blog({
                title,
                author,
                content,
                photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`
            });
            await newBlog.save();
        }
        catch (error) {
            return next(error);
        }

        /* 1.4 => Return Response */

        const blogDto = new BlogDTO(newBlog);
        return res.status(201).json({ blog: blogDto });

    },

    /* ----- B- GETTING ALL BLOGS ----- */

    async getAll(req, res, next) {

        try {

            // 2.1 => Retrieve all blogs from the database
            const blogs = await Blog.find({});
            // console.log("Blogs: ", blogs);

            // 2.2 => Converting blog objects to DTOs
            const blogsDto = [];
            for (let i = 0; i < blogs.length; i++) {
                const dto = new BlogDTO(blogs[i]);
                blogsDto.push(dto);
            }

            // 2.3 => Send response with the list of blog DTOs
            return res.status(200).json({ blogs: blogsDto });
        }
        catch (error) {
            return next(error);
        }


    },

    /* ----- C- GETTING BLOGS BY ID ----- */

    async getById(req, res, next) {

        // 1. Define Validate Scehma
        // 2. Validate ID
        // 3. Fetch and respond with the requested blog.
        // 4. Response

        // 3.1 => Defining Validating Schema for ID
        const getByIdSchema = Joi.object({
            id: Joi.string().regex(mongodbIDPattern).required()
        });

        // 3.2 => Validating ID
        const { error = null } = getByIdSchema.validate(req.params);

        if (error) {
            return next(error);
        };

        // 3.3 => Fetch and respond with the requested blog.
        let blog;

        const { id } = req.params;
        try {
            // 3.3.1 => Here populate method obtaining the author's name and username from user's schema. Because "author" in Blog's schema is refrenced to the user.
            blog = await Blog.findOne({ _id: id }).populate('author');
        } catch (error) {
            return next(error);
        };

        // 3.4 => Response
        const blogDto = new BlogDetailsDTO(blog);
        return res.status(200).json({ blog: blogDto });
    },

    /* ----- D- UPDATING BLOGS BY ID ----- */

    async updateBlog(req, res, next) {

        /* 
            1. Validation
            2. Retrieving Previous Photo
            3. Handling Photo
            4. Saving New Photo
            5. Updating The Blog
        */

        /* 4.1 => Validating Input */
        const updateBlogSchema = Joi.object({
            title: Joi.string().required(),
            content: Joi.string().required(),
            author: Joi.string().regex(mongodbIDPattern).required(),
            blogId: Joi.string().regex(mongodbIDPattern).required(),
            photo: Joi.string()

        });

        const { error = null } = updateBlogSchema.validate(req.body);

        if (error) {
            return next(error);
        };

        const { title, content, author, blogId, photo } = req.body;

        /* 4.2 => Retrieving Previous Photo */

        let blog;
        try {
            blog = await Blog.findOne({ _id: blogId });
        }
        catch (error) {
            return next(error);
        }

        /* 4.3 => Handling Photo */
        // 4.3.1 => Delete Previous Photo & Save New Photo 

        if (photo) {

            // 4.3.2 => Retrieving Photopath from the Schema
            let previousPhoto = blog.photoPath;
            // This code takes the previous photo's full path, extracts the filename from it and deletes it.
            previousPhoto = previousPhoto.split('/').at(-1);

            // 4.3.3 => Deleting Photo
            if (fs.existsSync(`storage/${previousPhoto}`)) {
                fs.unlinkSync(`storage/${previousPhoto}`);
            } else {
                return next(error);
            }

            // 4.4 => Saving new photo

            // 4.4.1 => Read as buffer.
            const base64PrefixPattern = /^data:image\/(png|jpg|jpeg);base64,/; // Containing data URIs
            const cleanedBase64 = photo.replace(base64PrefixPattern, ''); // Removing Data URIs
            const buffer = Buffer.from(cleanedBase64, 'base64'); // Cleaned base64 in Buffer form(Binary from)

            // 4.4.2 => Allot a random name 
            const imagePath = `${Date.now()}-${author}.png`;

            // 4.4.3 => Save locally
            try {
                fs.writeFileSync(`storage/${imagePath}`, buffer);
            }
            catch (error) {
                return next(error);
            };

            // 4.5 => Updating the Blog
            await Blog.updateOne({ _id: blogId },
                { title, content, photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}` }
            );
        }
        else {
            await Blog.updateOne({ _id: blogId }, { title, content });
        }
        return res.status(200).json({ message: 'Blog Updated!' })

    },

    /* ----- E- DELETING BLOGS BY ID ----- */

    async deleteBlog(req, res, next) {

        /* 
            1. Validation
            2. Delete Blog
            3. Delete Comments
        */

        /* 5.1 => Validation */
        const deleteBlogSchema = Joi.object({
            id: Joi.string().regex(mongodbIDPattern).required()
        });

        const { error = null } = deleteBlogSchema.validate(req.params);
        const { id } = req.params;

        /* 5.2 => Deleting Blogs and Comments */
        try {

            // 5.2.1 => The provided code snippet is used to delete both a specific blog post and all comments related to that blog post. 

            await Blog.deleteOne({ _id: id });
            await comment.deleteMany({ blog: id });

        } catch (error) {
            return next(error);
        }
        res.status(200).json({ message: 'Blog Deleted' })

    }

};

module.exports = blogController;