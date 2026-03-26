require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB connected');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        let admin = await User.findOne({ email: 'admin@test.com' });
        if (!admin) {
            admin = await User.create({
                name: 'Admin Test',
                email: 'admin@test.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Admin user created');
        } else {
            admin.password = hashedPassword;
            admin.role = 'admin';
            await admin.save();
            console.log('Admin user updated');
        }

        let student = await User.findOne({ email: 'student@test.com' });
        if (!student) {
            student = await User.create({
                name: 'Student Test',
                email: 'student@test.com',
                password: hashedPassword,
                role: 'student'
            });
            console.log('Student user created');
        } else {
            student.password = hashedPassword;
            student.role = 'student';
            await student.save();
            console.log('Student user updated');
        }

        process.exit(0);
    })
    .catch(err => {
        console.log(err);
        process.exit(1);
    });
