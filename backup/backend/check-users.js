const mongoose = require('mongoose');
const { User } = require('./src/models/User.ts');

mongoose.connect('mongodb://localhost:27017/technoline')
  .then(async () => {
    try {
      const users = await User.find({});
      console.log('Users in database:');
      users.forEach(user => {
        console.log(`- Email: ${user.email}, Role: ${user.role}`);
      });
    } catch (error) {
      console.error('Error:', error);
    }
    process.exit();
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  }); 