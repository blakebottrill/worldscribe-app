const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Import the path module

// Explicitly load .env file and capture the result
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5001;

// Middleware
// const corsOptions = { ... }; // Revert explicit options for now
app.use(cors()); // Allow all origins (simplest config)
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const articleRoutes = require('./routes/articles');
const timelineEventRoutes = require('./routes/timelineEvents');
const mapRoutes = require('./routes/maps');
const calendarSettingsRoutes = require('./routes/calendarSettings');
const worldRoutes = require('./routes/worlds');

// Define Routes
app.use('/api/articles', articleRoutes);
app.use('/api/timeline', timelineEventRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/calendar-settings', calendarSettingsRoutes);
app.use('/api/worlds', worldRoutes);
app.use('/api/ai', require('./routes/ai')); // Add AI routes
// TODO: Add other routes (timeline, auth)

// Basic Route
app.get('/', (req, res) => {
  res.send('Worldscribe API is running!');
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('MONGO_URI not defined in .env file. Database connection skipped.');
      return; // Don't attempt connection if URI is missing
    }
    await mongoose.connect(mongoURI, {
      // useNewUrlParser: true, // Deprecated options, no longer needed
      // useUnifiedTopology: true,
      // useCreateIndex: true, // Deprecated
      // useFindAndModify: false // Deprecated
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure if DB connection fails critically
    // process.exit(1);
    // For MVP, maybe allow server to run without DB? Log error instead.
    console.error('Server starting without database connection.');
  }
};

// Call the connectDB function
connectDB();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
}); 